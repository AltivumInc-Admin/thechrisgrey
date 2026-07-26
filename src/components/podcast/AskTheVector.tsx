import { useState } from 'react';
import { typography } from '../../utils/typography';
import { useChatEngine, usePageContext } from '../../hooks';
import type { DraftActionPodcastCitation } from '../../utils/chatEvents';
import ToolDraftCard from '../chat/ToolDraftCard';
import { slugify } from '../../utils/slugify';
import Icon from '../icons/Icon';

const PODCAST_ASK_STORAGE_KEY = 'podcast-ask-messages';

const EXAMPLE_PROMPTS = [
  'What do guests say about leaving the military?',
  'Which episodes talk about AI in defense?',
  'What is discussed about veteran mental health?',
];

/**
 * "Ask The Vector" — a focused, semantic search surface for the podcast. It reuses
 * the Strands-backed streaming chat engine (useChatEngine) with an isolated session
 * store, so questions here never mix into the main Alti conversation. The agent's
 * search_podcast tool answers from episode transcripts and emits podcast_citation
 * cards that deep-link to the exact YouTube timestamp.
 */
const AskTheVector = () => {
  const [input, setInput] = useState('');
  const pageContext = usePageContext();

  const { messages, isTyping, isStreaming, streamingMessageId, handleSend } = useChatEngine(pageContext, {
    storageKey: PODCAST_ASK_STORAGE_KEY,
    initialMessages: [],
  });

  const busy = isTyping || isStreaming;

  const reversed = [...messages].reverse();
  const lastUser = reversed.find((m) => m.role === 'user');
  const lastAssistant = reversed.find((m) => m.role === 'assistant' && !m.isSystem);
  const lastSystem = reversed.find((m) => m.isSystem);

  const citations = (lastAssistant?.drafts ?? []).filter(
    (d): d is DraftActionPodcastCitation => d.action === 'podcast_citation',
  );

  const hasConversation = Boolean(lastUser);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setInput('');
    handleSend(trimmed);
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
              id="ask-the-vector-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a topic, guest, or idea..."
              disabled={busy}
              autoComplete="off"
              className="flex-1 min-h-[48px] px-4 rounded-lg bg-altivum-dark/60 border border-white/15 text-white placeholder:text-altivum-silver focus:outline-hidden focus-visible:border-altivum-gold/60 focus-visible:ring-1 focus-visible:ring-altivum-gold/40 transition-colors duration-200 disabled:opacity-50"
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

          {/* Conversation: latest question, answer, and timestamp citations */}
          {hasConversation && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4" aria-live="polite">
              {lastUser && (
                <p className="text-altivum-silver/70 flex items-start gap-2" style={typography.smallText}>
                  <Icon
                    name="help_outline"
                    className="text-altivum-silver text-base mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{lastUser.content}</span>
                </p>
              )}

              {isTyping && !lastAssistant?.content && (
                <p className="text-altivum-silver flex items-center gap-2" style={typography.smallText}>
                  <Icon name="graphic_eq" className="text-altivum-gold/70 text-base animate-pulse" aria-hidden="true" />
                  <span>Searching the episodes…</span>
                </p>
              )}

              {lastAssistant?.content && (
                <p className="text-altivum-gold" style={typography.bodyText}>
                  {lastAssistant.content}
                  {lastAssistant.id === streamingMessageId && (
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

              {lastSystem && (
                <p className="text-altivum-silver/80 flex items-start gap-2" style={typography.smallText}>
                  <Icon name="info" className="text-altivum-silver/60 text-base mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{lastSystem.content}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AskTheVector;
