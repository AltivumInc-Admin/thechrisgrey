import { useMemo, useRef, useState } from 'react';
import { typography } from '../../utils/typography';
import { useChatEngine, usePageContext } from '../../hooks';
import type { Message } from '../../hooks';
import type { DraftActionPodcastCitation } from '../../utils/chatEvents';
import ToolDraftCard from '../chat/ToolDraftCard';
import { slugify } from '../../utils/slugify';
import Icon from '../icons/Icon';

const PODCAST_ASK_STORAGE_KEY = 'podcast-ask-messages';

// Mirrors MAX_MESSAGE_LENGTH in lambda/chat-stream/validation.mjs. The Lambda
// increments the atomic rate-limit counter BEFORE it validates the payload, so
// an over-length question would spend one of the visitor's 20 hourly requests
// only to earn a "your message is too long" notice. Cap it at the source.
const MAX_QUESTION_LENGTH = 4000;

const EXAMPLE_PROMPTS = [
  'What do guests say about leaving the military?',
  'Which episodes talk about AI in defense?',
  'What is discussed about veteran mental health?',
];

interface AskTurn {
  /** The most recent question. */
  question?: Message;
  /** The answer to THAT question, not merely the newest answer in the session. */
  answer?: Message;
  /** A rate-limit / guardrail notice raised by that same question. */
  notice?: Message;
}

/**
 * Everything this panel shows has to describe ONE turn.
 *
 * The engine appends the user message immediately but only creates the assistant
 * bubble when the first chunk arrives, appends system notices as separate entries,
 * drops the assistant bubble entirely when a turn produced only a notice, and never
 * prunes any of it. Picking the "last of each kind" out of the whole history
 * therefore mixed turns: a follow-up rendered the PREVIOUS answer and its "Play at
 * MM:SS" cards under the new question for the length of the search, and a single
 * rate-limit hit stayed pinned under every later answer for the rest of the tab
 * session. Anchoring on the last question and reading only forward from it keeps
 * the question, the answer, its citations and any notice in step.
 */
function deriveTurn(messages: Message[]): AskTurn {
  let questionIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') {
      questionIndex = i;
      break;
    }
  }
  if (questionIndex === -1) return {};

  let answer: Message | undefined;
  let notice: Message | undefined;
  for (let i = messages.length - 1; i > questionIndex; i -= 1) {
    const message = messages[i];
    if (message.isSystem) {
      if (!notice) notice = message;
    } else if (message.role === 'assistant') {
      if (!answer) answer = message;
    }
    if (answer && notice) break;
  }

  return { question: messages[questionIndex], answer, notice };
}

/**
 * "Ask The Vector" — a focused, semantic search surface for the podcast. It reuses
 * the Strands-backed streaming chat engine (useChatEngine) with its own session
 * store, so the transcript here never mixes into the main Alti conversation. The
 * agent's search_podcast tool answers from episode transcripts and emits
 * podcast_citation cards that deep-link to the exact YouTube timestamp.
 *
 * The transcript is the only thing isolated. useChatEngine attaches the visitor's
 * device id to every request whatever the surface, and that field alone is what
 * makes the Lambda load stored facts into the prompt and register remember_fact —
 * so this box can read from and write to the 90-day memory store like any other.
 * Until ChatEngineOptions can be told to omit the device id, it at least renders
 * the memory_update events the widget renders, so the write is visible where it
 * happens rather than silent on the surface documented as isolated.
 */
const AskTheVector = () => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pageContext = usePageContext();

  const { messages, isTyping, isStreaming, streamingMessageId, handleSend } = useChatEngine(pageContext, {
    storageKey: PODCAST_ASK_STORAGE_KEY,
    initialMessages: [],
    // This box answers questions about episodes, not about the visitor. The
    // distinct storageKey only isolates the transcript in this tab; the 90-day
    // server-side memory is partitioned by device id, so it takes this flag to
    // keep an episode question out of the visitor's remembered facts.
    omitDeviceId: true,
  });

  const busy = isTyping || isStreaming;

  const { question, answer, notice } = useMemo(() => deriveTurn(messages), [messages]);

  const citations = useMemo(
    () => (answer?.drafts ?? []).filter((d): d is DraftActionPodcastCitation => d.action === 'podcast_citation'),
    [answer],
  );

  // The engine attaches the visitor's device id to every surface, so the agent can
  // write a fact to the 90-day memory store from here just as it can from the
  // widget. The widget discloses that write; this box did not, which made it
  // invisible on the one surface documented as isolated.
  const memoryEvents = answer?.memoryEvents ?? [];

  const hasConversation = Boolean(question);
  // Gated on the CURRENT turn's answer text, so it fires on every question rather
  // than only the first, and stays up through the whole KB retrieval + agent turn.
  const searching = busy && !answer?.content;

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setInput('');
    handleSend(trimmed);
    // Sending disables the Ask button and unmounts the example prompts — whichever
    // of the two the user activated, the browser would drop focus to <body> and
    // strand a keyboard user at the top of the page. Park focus on the input,
    // which stays mounted and focusable throughout the search.
    inputRef.current?.focus();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  return (
    <section className="py-20 bg-altivum-dark">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="rounded-2xl border border-altivum-gold/20 bg-linear-to-b from-white/4 to-transparent p-6 sm:p-8">
          {/* Heading */}
          <div className="flex items-center gap-2 mb-2">
            <Icon name="graphic_eq" className="text-altivum-gold/80 text-xl" aria-hidden="true" />
            <h2 id={slugify('Ask The Vector')} className="text-white" style={typography.cardTitleSmall}>
              Ask The Vector
            </h2>
          </div>
          <p className="text-altivum-silver mb-6" style={typography.smallText}>
            Search every episode by meaning. Ask a question and jump straight to the moment it was discussed.
          </p>

          {/* Input */}
          <form onSubmit={onSubmit} className="flex items-stretch gap-2">
            <label htmlFor="ask-the-vector-input" className="sr-only">
              Ask a question about The Vector Podcast
            </label>
            <input
              ref={inputRef}
              id="ask-the-vector-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a topic, guest, or idea..."
              // readOnly, not disabled: browsers move focus to <body> the moment the
              // focused element is disabled. submit() already refuses to send while
              // busy, so this only has to stop typing, not stop the send.
              readOnly={busy}
              aria-disabled={busy}
              maxLength={MAX_QUESTION_LENGTH}
              autoComplete="off"
              className={`flex-1 min-h-[48px] px-4 rounded-lg bg-altivum-dark/60 border border-white/15 text-white placeholder:text-altivum-silver focus:outline-hidden focus-visible:border-altivum-gold/60 focus-visible:ring-1 focus-visible:ring-altivum-gold/40 transition-colors duration-200 ${busy ? 'opacity-50' : ''}`}
              style={typography.bodyText}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Search the podcast"
              className="min-h-[48px] px-5 inline-flex items-center justify-center gap-2 rounded-lg bg-altivum-gold/10 text-altivum-gold border border-altivum-gold/40 hover:bg-altivum-gold/20 hover:shadow-[0_0_20px_rgba(197,165,114,0.3)] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none touch-manipulation"
            >
              <Icon name={busy ? 'hourglass_empty' : 'search'} className="text-xl leading-none" />
              <span className="hidden sm:inline text-sm">Ask</span>
            </button>
          </form>

          {/* Example prompts — shown until the first question */}
          {!hasConversation && (
            <div className="mt-5">
              <p className="text-altivum-silver uppercase tracking-wider mb-3" style={typography.smallText}>
                Try asking
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submit(prompt)}
                    className="text-left px-3 py-2 rounded-lg border border-white/10 text-altivum-silver hover:border-altivum-gold/40 hover:text-white transition-colors duration-200 touch-manipulation"
                    style={typography.smallText}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation: the current question, its answer, and its timestamp citations.
              The wrapper stays mounted even when empty: a live region that enters the DOM
              together with its first content is never announced, so the first answer was
              silent. `off` while the reply streams stops every chunk re-announcing the
              whole paragraph — the same contract TraceResponseBubble documents. */}
          <div
            className={hasConversation ? 'mt-6 pt-6 border-t border-white/10 space-y-4' : undefined}
            aria-live={busy ? 'off' : 'polite'}
            aria-busy={busy}
          >
            {question && (
              <p className="text-altivum-silver/70 flex items-start gap-2" style={typography.smallText}>
                <Icon
                  name="help_outline"
                  className="text-altivum-silver text-base mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{question.content}</span>
              </p>
            )}

            {searching && (
              <p className="text-altivum-silver flex items-center gap-2" style={typography.smallText}>
                <Icon name="graphic_eq" className="text-altivum-gold/70 text-base animate-pulse" aria-hidden="true" />
                <span>Searching the episodes…</span>
              </p>
            )}

            {answer?.content && (
              <p className="text-altivum-gold" style={typography.bodyText}>
                {answer.content}
                {answer.id === streamingMessageId && (
                  <span
                    className="inline-block w-[2px] h-[1em] bg-altivum-gold ml-0.5 animate-pulse align-middle"
                    aria-hidden="true"
                  />
                )}
              </p>
            )}

            {citations.length > 0 && (
              <div className="space-y-3">
                {citations.map((citation, idx) => (
                  <ToolDraftCard key={`${citation.videoId}-${citation.startSeconds}-${idx}`} action={citation} />
                ))}
              </div>
            )}

            {memoryEvents.map((event, idx) => (
              <p
                key={`memory-${idx}`}
                className="text-altivum-silver/80 flex items-center gap-2"
                style={typography.smallText}
              >
                <Icon name="bookmark_added" className="text-altivum-gold/70 text-base shrink-0" aria-hidden="true" />
                <span>{event.action === 'remembered' ? 'Saved that for next time.' : 'Cleared what I had saved.'}</span>
              </p>
            ))}

            {notice && (
              <p className="text-altivum-silver/80 flex items-start gap-2" style={typography.smallText}>
                <Icon name="info" className="text-altivum-silver/60 text-base mt-0.5 shrink-0" aria-hidden="true" />
                <span>{notice.content}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AskTheVector;
