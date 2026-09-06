import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionStorage } from './useSessionStorage';
import type { PageContext } from '../utils/pageContext';
import { getSessionToken, sessionTokens } from '../utils/sessionToken';
import { getOrCreateDeviceId, clearDeviceId } from '../utils/deviceId';
import { createChatStreamParser, type DraftAction, type ChatEvent, type ParsedChunk } from '../utils/chatEvents';
import { withTraceId } from '../utils/traceId';
import { createLogger } from '../utils/logger';
import { joinEndpoint } from '../utils/endpoint';
import { isMotionDisabled } from '../utils/motion';
import type { UiBlock } from '../utils/uiBlocks';

const log = createLogger('ChatEngine');

const MAX_HISTORY = 20;

// Two phases of a send, two budgets. The session-token handshake (Turnstile +
// issuance) has to be bounded or a hung issuer leaves the turn pending with the
// typing indicator up forever. The answer then gets a FRESH budget, because the
// server's own ceiling — a 25s agent budget (lambda/chat-stream/index.mjs) plus
// up to 4s of KB retrieval — has to fit inside it. One 30s timer spanning both
// phases, which is what this used to be, aborted answers the Lambda was still
// streaming successfully.
const TOKEN_TIMEOUT_MS = 20_000;
const STREAM_TIMEOUT_MS = 45_000;

// A DynamoDB delete behind API Gateway. Past this it is a stalled request, and
// an unbounded await strands the caller's "Clearing your saved facts" banner on
// screen with nothing that can ever clear it.
const FORGET_TIMEOUT_MS = 10_000;

// How close to the bottom of the scroller still counts as "the reader is
// following the stream" and wants new tokens to pull the view down.
const SCROLL_STICKY_THRESHOLD_PX = 80;

// Streamed text is coalesced onto this tick before it reaches React state. Every
// commit re-renders the whole transcript AND re-serializes it to sessionStorage
// (useSessionStorage writes on each change), so committing per decoded chunk
// billed a few hundred of those per answer. At ~16 commits a second the type-out
// still reads as continuous — the animation is the arrival of text, not the
// frame rate — while the work drops by roughly 5x. The buffer never delays the
// FIRST tokens (see `first` below) or an event, so nothing latency-visible waits
// on it.
const TEXT_FLUSH_INTERVAL_MS = 60;

const TRUNCATED_NOTICE = 'That answer was cut off before it finished. Please ask again.';

/**
 * Confirmation copy for the destructive forget-me action. Exported so the
 * floating widget and the full /chat page prompt with the same words instead of
 * each carrying its own literal and silently drifting apart.
 */
export const FORGET_CONFIRMATION =
  'Forget everything you told Alti? This deletes your saved facts and cannot be undone.';

export interface MemoryEventRecord {
  action: 'remembered' | 'forgotten';
  content?: string;
}

export interface ForgetResult {
  ok: boolean;
  deleted?: number;
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isSystem?: boolean;
  /**
   * The stream died after this bubble had already rendered part of an answer.
   * The half-sentence stays visible (deleting it mid-read would be worse), but
   * the history filter drops it so a truncated turn is never replayed to the
   * model as if it were what Alti actually said.
   */
  truncated?: boolean;
  drafts?: DraftAction[];
  uiBlocks?: UiBlock[];
  toolActivity?: { tool: string; status: 'invoked' | 'complete' }[];
  memoryEvents?: MemoryEventRecord[];
}

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT;
// Shared INTENTIONALLY across the floating widget and the full /chat page: it's
// what carries a conversation from the widget onto /chat (and back). Do NOT split
// this into per-surface keys — that would break that continuity. There is no
// write race: sessionStorage is per-tab, and the widget is hidden on /chat, so
// the two engines never mount at the same time on the same page.
export const CHAT_STORAGE_KEY = 'chat-messages';

export const initialWelcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hey there, I'm Alti\u2122, Altivum's official AI Agent and friend of Christian's. Feel free to ask about his background, Altivum\u00AE Inc, The Vector Podcast, or his book \"Beyond the Assessment.\" What would you like to know?",
  timestamp: new Date(),
};

function applyEventToMessage(msg: Message, event: ChatEvent): Message {
  switch (event.kind) {
    case 'draft_action': {
      const drafts = msg.drafts ? [...msg.drafts, event] : [event];
      return { ...msg, drafts };
    }
    case 'ui_block': {
      const uiBlocks = msg.uiBlocks ? [...msg.uiBlocks, event.block] : [event.block];
      return { ...msg, uiBlocks };
    }
    case 'tool_invocation': {
      const toolActivity = msg.toolActivity ? [...msg.toolActivity] : [];
      toolActivity.push({ tool: event.tool, status: 'invoked' });
      return { ...msg, toolActivity };
    }
    case 'tool_result': {
      const toolActivity = msg.toolActivity ? [...msg.toolActivity] : [];
      const lastIdx = [...toolActivity].reverse().findIndex((t) => t.tool === event.tool && t.status === 'invoked');
      if (lastIdx !== -1) {
        const forwardIdx = toolActivity.length - 1 - lastIdx;
        toolActivity[forwardIdx] = { tool: event.tool, status: 'complete' };
      } else {
        toolActivity.push({ tool: event.tool, status: 'complete' });
      }
      return { ...msg, toolActivity };
    }
    case 'memory_update': {
      const memoryEvents = msg.memoryEvents ? [...msg.memoryEvents] : [];
      memoryEvents.push({ action: event.action, content: event.content });
      return { ...msg, memoryEvents };
    }
    case 'guardrail':
      return msg;
    default:
      return msg;
  }
}

/*
 * Stream reducers. Pure `(messages, ...) => messages` functions at module scope,
 * matching applyEventToMessage above, so the streaming state machine can be
 * exercised directly instead of only through a fetch mock — and so the system
 * bubble is constructed in exactly one place.
 */

/** Create the assistant bubble for `id` if this turn has not opened one yet. */
export function ensureAssistantMessage(messages: Message[], id: string): Message[] {
  if (messages.some((m) => m.id === id)) return messages;
  return [...messages, { id, role: 'assistant', content: '', timestamp: new Date() }];
}

/** Append decoded text to the turn's assistant bubble, opening it if needed. */
export function appendAssistantText(messages: Message[], id: string, text: string): Message[] {
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return [...messages, { id, role: 'assistant', content: text, timestamp: new Date() }];
  const merged: Message = { ...messages[idx], content: messages[idx].content + text };
  return [...messages.slice(0, idx), merged, ...messages.slice(idx + 1)];
}

/**
 * Append a standalone system notice. Ids are random rather than time-based: two
 * notices in the same millisecond would otherwise collide on their React key.
 */
export function appendSystemMessage(messages: Message[], text: string): Message[] {
  return [
    ...messages,
    { id: `system-${crypto.randomUUID()}`, role: 'assistant', content: text, timestamp: new Date(), isSystem: true },
  ];
}

/** Fold a framed protocol event into the turn's assistant bubble. */
export function applyEventToMessages(messages: Message[], id: string, event: ChatEvent): Message[] {
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return messages;
  const updated = applyEventToMessage(messages[idx], event);
  return [...messages.slice(0, idx), updated, ...messages.slice(idx + 1)];
}

/** Flag a partially-streamed bubble so the history filter stops replaying it. */
export function markTruncated(messages: Message[], id: string): Message[] {
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return messages;
  return [...messages.slice(0, idx), { ...messages[idx], truncated: true }, ...messages.slice(idx + 1)];
}

export interface ChatEngineOptions {
  /** sessionStorage key — pass a distinct key to isolate a conversation (e.g. the podcast ask-box). */
  storageKey?: string;
  /** Seed messages — defaults to Alti's welcome. Pass [] for a welcome-free surface. */
  initialMessages?: Message[];
  /**
   * Omit the device id from the request body, so this surface neither reads nor
   * writes the 90-day visitor memory. A distinct `storageKey` isolates the
   * transcript in the browser but NOT the server-side memory partition, which is
   * keyed on the device id alone — so without this a topic-scoped surface would
   * quietly file facts into, and recall them from, the main Alti memory.
   */
  omitDeviceId?: boolean;
}

export function useChatEngine(pageContext?: PageContext, options?: ChatEngineOptions) {
  const storageKey = options?.storageKey ?? CHAT_STORAGE_KEY;
  const omitDeviceId = options?.omitDeviceId ?? false;
  const seedMessages = options?.initialMessages ?? [initialWelcomeMessage];
  const [messages, setMessages, clearMessages] = useSessionStorage<Message[]>(storageKey, seedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);
  // `streamingMessageId` state is what consumers (ChatWidgetPanel, AskTheVector,
  // the Chat page) read to highlight the bubble currently streaming. The ref
  // is the source of truth for handleSend's async closure — it needs the
  // latest value across `await` boundaries within a single send cycle, which
  // a state closure cannot give. The two are kept in lockstep: every write to
  // the ref is paired with setStreamingMessageId in the same statement.
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  const forgetInFlightRef = useRef<Promise<ForgetResult> | null>(null);
  const lastScrollHeightRef = useRef(0);
  const forceScrollRef = useRef(true);

  // Keep messagesRef in sync with the messages state outside of render
  // (the prior `messagesRef.current = messages` at module body level was a
  // ref mutation during render — react-hooks/refs flags it). handleSend
  // reads messagesRef.current after this commit, so the one-frame lag
  // between state change and effect commit is invisible in practice.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const showSuggestions = !hasUserMessages;

  const handleClearConversation = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // Follow the stream only while the reader is parked at the bottom. Streaming
  // appends produce a new messages array on every decoded chunk, so scrolling
  // unconditionally yanks a visitor who scrolled up to re-read an earlier answer
  // or a draft card back down on every single token.
  //
  // Stickiness is derived from how far the scroller had drifted from the bottom
  // BEFORE this update's content landed (subtract out how much the content just
  // grew). That needs no scroll listener, so it honours every way a visitor can
  // take the scroller over — wheel, touch, keyboard, scrollbar drag — and it
  // re-arms on its own the moment they scroll back down.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const grew = Math.max(0, el.scrollHeight - lastScrollHeightRef.current);
    lastScrollHeightRef.current = el.scrollHeight;
    const driftBeforeUpdate = el.scrollHeight - el.scrollTop - el.clientHeight - grew;

    // A new user turn re-arms following even if the visitor had scrolled away:
    // they just spoke, so they want to see the reply.
    const forced = forceScrollRef.current;
    forceScrollRef.current = false;
    if (!forced && driftBeforeUpdate > SCROLL_STICKY_THRESHOLD_PX) return;

    el.scrollTo({
      top: el.scrollHeight,
      // Instant while an answer streams: a smooth animation cannot keep up with
      // per-token appends, and its lagging scrollTop would read as "the visitor
      // scrolled up" on the next chunk and stop the follow dead. Reduced-motion
      // visitors get the instant jump either way (isMotionDisabled is the
      // project's single gate for that).
      behavior: isStreaming || isMotionDisabled() ? 'auto' : 'smooth',
    });
  }, [messages, isTyping, isStreaming]);

  const handleSend = useCallback(
    async (content: string) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const myController = controller;
      let timeoutId = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);

      const userMessage: Message = {
        id: `user-${crypto.randomUUID()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      forceScrollRef.current = true;
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      const allMessages = [
        ...messagesRef.current.filter(
          (m) => m.id !== 'welcome' && !m.isSystem && !m.truncated && m.content.trim().length > 0,
        ),
        userMessage,
      ];
      const windowed =
        allMessages.length > MAX_HISTORY ? allMessages.slice(allMessages.length - MAX_HISTORY) : allMessages;
      const conversationHistory = windowed.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Welcome-back (VAL-ENG-012): signal the backend that this is the first
      // user message of a new session. The backend only emits the welcome-back
      // greeting when this is true AND the visitor has stored facts, so a
      // first-time visitor never sees it and it never repeats on later turns.
      // Computed from the PRIOR message list (before userMessage was appended)
      // so the very first send in a session is the one that carries the flag.
      const isFirstMessage = !messagesRef.current.some((m) => m.role === 'user');

      const assistantMessageId = `assistant-${crypto.randomUUID()}`;
      const myId = assistantMessageId;
      streamingMessageIdRef.current = assistantMessageId;
      setStreamingMessageId(assistantMessageId);
      setIsStreaming(true);

      const deviceId = getOrCreateDeviceId();

      // Whether ANY output has been applied to the screen for this send. Drives
      // the first-chunk transition out of the typing indicator, and — in the
      // catch below — the difference between "nothing arrived" and "the answer
      // was cut off mid-sentence".
      let producedOutput = false;

      // Decoded text waits here for the flush tick rather than going straight
      // into state. Every exit from the stream — clean end, error, abort — has
      // to call flushText(), or the tail of the answer is stranded in this
      // closure and never reaches the screen.
      let pendingText = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const flushText = () => {
        if (flushTimer !== null) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (!pendingText) return;
        const text = pendingText;
        pendingText = '';
        setMessages((prev) => appendAssistantText(prev, assistantMessageId, text));
      };

      try {
        const requestBody = JSON.stringify({
          messages: conversationHistory,
          ...(deviceId && !omitDeviceId && { deviceId }),
          ...(isFirstMessage && { firstMessage: true }),
          ...(pageContext && {
            pageContext: {
              currentPage: pageContext.currentPage,
              pageTitle: pageContext.pageTitle,
              section: pageContext.section,
              visitedPages: pageContext.visitedPages,
            },
          }),
        });
        const token = await getSessionToken('chat');

        // Handshake done: hand the answer its own budget.
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

        const response = await fetch(
          CHAT_ENDPOINT,
          withTraceId({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: requestBody,
            signal: controller.signal,
          }),
        );

        if (!response.ok) throw new Error('Failed to get response');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const parser = createChatStreamParser();

        // One dispatch for both the read loop and the flush tail — they used to
        // be byte-identical copies, so a fix to one silently missed the other.
        const consume = (parts: ParsedChunk[]) => {
          for (const part of parts) {
            const first = !producedOutput;
            if (first) {
              producedOutput = true;
              setIsTyping(false);
              setMessages((prev) => ensureAssistantMessage(prev, assistantMessageId));
            }
            if (part.kind === 'text') {
              pendingText += part.text;
              // The buffer exists to stop the hundredth commit, not to delay the
              // first: the opening tokens go straight to screen so
              // time-to-first-token is unchanged and the typing indicator never
              // hands off to an empty bubble.
              if (first) flushText();
              else if (flushTimer === null) flushTimer = setTimeout(flushText, TEXT_FLUSH_INTERVAL_MS);
            } else if (part.kind === 'system') {
              // Drain the buffer first so the notice lands after the text that
              // preceded it on the wire, not before it.
              flushText();
              setMessages((prev) => appendSystemMessage(prev, part.text));
            } else {
              flushText();
              setMessages((prev) =>
                applyEventToMessages(ensureAssistantMessage(prev, assistantMessageId), assistantMessageId, part.event),
              );
            }
          }
        };

        if (reader) {
          let done = false;
          while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
              consume(parser.push(decoder.decode(result.value, { stream: true })));
            }
          }

          consume(parser.flush());
          // Whatever the last tick did not carry. Runs before the checks below
          // so they see the finished bubble, not a half-committed one.
          flushText();

          if (!producedOutput) {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMessageId,
                role: 'assistant' as const,
                content: 'I received an empty response. Please try again.',
                timestamp: new Date(),
              },
            ]);
          } else {
            // Output WAS produced (e.g. a SYS system message or events only) but the
            // assistant placeholder created by ensureAssistantMessage never received
            // any text. Drop the dead empty bubble so it neither renders nor poisons
            // history — BUT only if it carries nothing else. A turn whose FINAL output
            // was a tool/event (e.g. a navigate draft card, a UI block, or a memory
            // update) with no concluding text — reachable when rec7's
            // BeforeModelCallEvent loop cap cancels the agent after a tool event —
            // produces an empty-text bubble that still carries a
            // draft/uiBlock/toolActivity/memoryEvent. ChatMessage renders those
            // independently of content, so they must survive.
            setMessages((prev) =>
              prev.filter(
                (m) =>
                  !(
                    m.id === assistantMessageId &&
                    m.content.trim().length === 0 &&
                    !m.drafts?.length &&
                    !m.uiBlocks?.length &&
                    !m.toolActivity?.length &&
                    !m.memoryEvents?.length
                  ),
              ),
            );
          }
        }
      } catch (error) {
        // A stream that dies mid-tick still owns whatever it had decoded: commit
        // it before the truncation marker so the visible fragment is everything
        // that actually arrived.
        flushText();
        setIsTyping(false);
        const aborted = error instanceof Error && error.name === 'AbortError';
        if (!aborted) {
          log.error('chat_error', { error: error instanceof Error ? error.message : String(error) });
        }

        if (producedOutput) {
          // Text was already on screen when the stream died (the 45s cap, a
          // dropped connection, or the unmount-abort that fires when the visitor
          // closes the widget or clicks "Open full chat"). The `finally` below
          // clears streamingMessageId, so the caret vanishes and the fragment
          // would otherwise be indistinguishable from a finished answer — and
          // would be replayed to the model as one on the next turn.
          const superseded = abortControllerRef.current !== myController;
          setMessages((prev) => {
            const marked = markTruncated(prev, assistantMessageId);
            // A newer send already superseded this one (abort-on-resend): the
            // notice would land AFTER the visitor's next question and read as a
            // reply to it. Flagging the turn is enough — the new answer is the
            // feedback.
            return superseded ? marked : appendSystemMessage(marked, TRUNCATED_NOTICE);
          });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMessageId,
              role: 'assistant' as const,
              content: aborted
                ? 'The response timed out. Please try again.'
                : 'I encountered an error. Please try again.',
              timestamp: new Date(),
            },
          ]);
        }
      } finally {
        clearTimeout(timeoutId);
        // Both paths above flush first, so this only ever collects a timer whose
        // buffer is already empty — but a pending tick outliving the turn would
        // append text to a bubble the next send has moved past.
        if (flushTimer !== null) clearTimeout(flushTimer);
        // Only clear the shared refs/UI if THIS request is still the active one.
        // A late-settling request must not clobber a newer in-flight request's
        // controller (used by unmount-abort) or its streaming UI state.
        if (abortControllerRef.current === myController) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
        if (streamingMessageIdRef.current === myId) {
          streamingMessageIdRef.current = null;
          setStreamingMessageId(null);
        }
      }
    },
    // omitDeviceId is read inside the request body, so it belongs here. Reading
    // the primitive off `options` (rather than depending on the object) keeps the
    // callback stable for callers that pass a fresh options literal each render.
    [setMessages, pageContext, omitDeviceId],
  );

  const runForget = useCallback(async (): Promise<ForgetResult> => {
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
      clearDeviceId();
      // The cached session token is signed over a hash of the device id we just
      // erased. Leaving it cached keeps presenting the erased identity to the
      // server for the rest of its 30-minute TTL, so any fact written in that
      // window lands back in the partition the visitor asked us to wipe.
      sessionTokens.reset();
      clearMessages();
      return { ok: true, deleted: 0 };
    }
    const forgetUrl = joinEndpoint(CHAT_ENDPOINT, '/forget');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FORGET_TIMEOUT_MS);
    try {
      const requestBody = JSON.stringify({ deviceId });
      const token = await getSessionToken('chat');
      const response = await fetch(
        forgetUrl,
        withTraceId({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: requestBody,
          signal: controller.signal,
        }),
      );
      let json: { ok?: boolean; deleted?: number; error?: string } | null = null;
      try {
        json = await response.json();
      } catch {
        return { ok: false, error: 'Unable to parse response.' };
      }
      if (!response.ok || !json?.ok) {
        return { ok: false, error: json?.error || 'Server declined request.' };
      }
      clearDeviceId();
      sessionTokens.reset();
      clearMessages();
      return { ok: true, deleted: json.deleted };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Deliberately NOT clearing the device id here: the delete may still be
        // in flight server-side, and a retry has to target the same partition.
        return { ok: false, error: 'That took too long. Please try again.' };
      }
      return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
    } finally {
      clearTimeout(timeoutId);
    }
  }, [clearMessages]);

  const handleForgetMemory = useCallback((): Promise<ForgetResult> => {
    // Both surfaces keep their forget control live while the request runs, so an
    // impatient second click would otherwise stack concurrent deletes against
    // the same partition. Repeat callers await the outcome already in flight.
    if (forgetInFlightRef.current) return forgetInFlightRef.current;
    setIsForgetting(true);
    const pending = runForget().finally(() => {
      forgetInFlightRef.current = null;
      setIsForgetting(false);
    });
    forgetInFlightRef.current = pending;
    return pending;
  }, [runForget]);

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  return {
    messages,
    isTyping,
    isStreaming,
    isForgetting,
    streamingMessageId,
    messagesContainerRef,
    hasUserMessages,
    showSuggestions,
    handleSend,
    handleClearConversation,
    handleSuggestionSelect,
    handleForgetMemory,
  };
}
