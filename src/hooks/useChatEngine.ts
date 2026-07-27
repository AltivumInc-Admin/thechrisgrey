import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionStorage } from './useSessionStorage';
import type { PageContext } from '../utils/pageContext';
import { getSessionToken } from '../utils/sessionToken';
import { getOrCreateDeviceId, clearDeviceId } from '../utils/deviceId';
import { createChatStreamParser, type DraftAction, type ChatEvent } from '../utils/chatEvents';
import { withTraceId } from '../utils/traceId';
import { createLogger } from '../utils/logger';
import type { UiBlock } from '../utils/uiBlocks';

const log = createLogger('ChatEngine');

const MAX_HISTORY = 20;

export interface MemoryEventRecord {
  action: 'remembered' | 'forgotten';
  content?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isSystem?: boolean;
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

export interface ChatEngineOptions {
  /** sessionStorage key — pass a distinct key to isolate a conversation (e.g. the podcast ask-box). */
  storageKey?: string;
  /** Seed messages — defaults to Alti's welcome. Pass [] for a welcome-free surface. */
  initialMessages?: Message[];
}

export function useChatEngine(pageContext?: PageContext, options?: ChatEngineOptions) {
  const storageKey = options?.storageKey ?? CHAT_STORAGE_KEY;
  const seedMessages = options?.initialMessages ?? [initialWelcomeMessage];
  const [messages, setMessages, clearMessages] = useSessionStorage<Message[]>(storageKey, seedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
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

  // Keep messagesRef in sync with the messages state outside of render
  // (the prior `messagesRef.current = messages` at module body level was a
  // ref mutation during render — react-hooks/refs flags it). handleSend
  // reads messagesRef.current after this commit, so the one-frame lag
  // between state change and effect commit is invisible in practice.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionStorage.removeItem('chat-typing');
  }, []);

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

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = useCallback(
    async (content: string) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const myController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const userMessage: Message = {
        id: `user-${crypto.randomUUID()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      const allMessages = [
        ...messagesRef.current.filter((m) => m.id !== 'welcome' && !m.isSystem && m.content.trim().length > 0),
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

      try {
        const requestBody = JSON.stringify({
          messages: conversationHistory,
          ...(deviceId && { deviceId }),
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

        const ensureMessage = () => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === assistantMessageId)) return prev;
            return [
              ...prev,
              {
                id: assistantMessageId,
                role: 'assistant' as const,
                content: '',
                timestamp: new Date(),
              },
            ];
          });
        };

        const applyText = (text: string, isSystem: boolean) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMessageId);
            if (idx === -1) {
              if (isSystem) {
                return [
                  ...prev,
                  {
                    id: `system-${Date.now()}`,
                    role: 'assistant' as const,
                    content: text,
                    timestamp: new Date(),
                    isSystem: true,
                  },
                ];
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: 'assistant' as const,
                  content: text,
                  timestamp: new Date(),
                },
              ];
            }
            const existing = prev[idx];
            if (isSystem) {
              const systemMessage: Message = {
                id: `system-${Date.now()}`,
                role: 'assistant',
                content: text,
                timestamp: new Date(),
                isSystem: true,
              };
              return [...prev, systemMessage];
            }
            const merged: Message = { ...existing, content: existing.content + text };
            return [...prev.slice(0, idx), merged, ...prev.slice(idx + 1)];
          });
        };

        const applyEvent = (event: ChatEvent) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMessageId);
            if (idx === -1) return prev;
            const updated = applyEventToMessage(prev[idx], event);
            return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
          });
        };

        if (reader) {
          let done = false;
          let firstOutput = true;
          while (!done) {
            const result = await reader.read();
            done = result.done;

            if (result.value) {
              const chunk = decoder.decode(result.value, { stream: true });
              const parts = parser.push(chunk);

              for (const part of parts) {
                if (firstOutput) {
                  firstOutput = false;
                  setIsTyping(false);
                  ensureMessage();
                }
                if (part.kind === 'text') {
                  applyText(part.text, false);
                } else if (part.kind === 'system') {
                  applyText(part.text, true);
                } else if (part.kind === 'event') {
                  ensureMessage();
                  applyEvent(part.event);
                }
              }
            }
          }

          const tail = parser.flush();
          for (const part of tail) {
            if (firstOutput) {
              firstOutput = false;
              setIsTyping(false);
              ensureMessage();
            }
            if (part.kind === 'text') applyText(part.text, false);
            else if (part.kind === 'system') applyText(part.text, true);
            else if (part.kind === 'event') {
              ensureMessage();
              applyEvent(part.event);
            }
          }

          if (firstOutput) {
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
            // assistant placeholder created by ensureMessage() never received any text.
            // Drop the dead empty bubble so it neither renders nor poisons history —
            // BUT only if it carries nothing else. A turn whose FINAL output was a
            // tool/event (e.g. a navigate draft card, a UI block, or a memory update)
            // with no concluding text — reachable when rec7's BeforeModelCallEvent
            // loop cap cancels the agent after a tool event — produces an empty-text
            // bubble that still carries a draft/uiBlock/toolActivity/memoryEvent.
            // ChatMessage renders those independently of content, so they must survive.
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
        setIsTyping(false);
        if (error instanceof Error && error.name === 'AbortError') {
          setMessages((prev) => {
            const hasMessage = prev.some((m) => m.id === assistantMessageId);
            if (hasMessage) return prev;
            return [
              ...prev,
              {
                id: assistantMessageId,
                role: 'assistant' as const,
                content: 'The response timed out. Please try again.',
                timestamp: new Date(),
              },
            ];
          });
        } else {
          log.error('chat_error', { error: error instanceof Error ? error.message : String(error) });
          setMessages((prev) => {
            const hasMessage = prev.some((m) => m.id === assistantMessageId);
            if (hasMessage) return prev;
            return [
              ...prev,
              {
                id: assistantMessageId,
                role: 'assistant' as const,
                content: 'I encountered an error. Please try again.',
                timestamp: new Date(),
              },
            ];
          });
        }
      } finally {
        clearTimeout(timeoutId);
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
    [setMessages, pageContext],
  );

  const handleForgetMemory = useCallback(async (): Promise<{ ok: boolean; deleted?: number; error?: string }> => {
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
      clearDeviceId();
      clearMessages();
      return { ok: true, deleted: 0 };
    }
    const requestBody = JSON.stringify({ deviceId });
    const token = await getSessionToken('chat');
    const forgetUrl = CHAT_ENDPOINT.endsWith('/') ? `${CHAT_ENDPOINT}forget` : `${CHAT_ENDPOINT}/forget`;
    try {
      const response = await fetch(
        forgetUrl,
        withTraceId({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: requestBody,
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
      clearMessages();
      return { ok: true, deleted: json.deleted };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
    }
  }, [clearMessages]);

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
