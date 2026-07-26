import { typography } from '../../utils/typography';
import { memo, useMemo, useState, useRef, useEffect, ReactNode } from 'react';
import type { DraftAction } from '../../utils/chatEvents';
import type { UiBlock } from '../../utils/uiBlocks';
import ToolDraftCard from './ToolDraftCard';
import GenerativeBlocks from './GenerativeBlocks';
import Icon from '../icons/Icon';

interface MemoryEventRecord {
  action: 'remembered' | 'forgotten';
  content?: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isSystem?: boolean;
  drafts?: DraftAction[];
  uiBlocks?: UiBlock[];
  toolActivity?: { tool: string; status: 'invoked' | 'complete' }[];
  memoryEvents?: MemoryEventRecord[];
  /** 'page' enables generative UI blocks; 'widget' (default) never renders them. */
  surface?: 'page' | 'widget';
}

const TOOL_LABELS: Record<string, string> = {
  navigate_to: 'navigating',
  draft_message: 'drafting a message',
  draft_newsletter_subscription: 'preparing a subscription',
  cite_blog_passage: 'looking up a blog post',
  search_podcast: 'searching the podcast',
  remember_fact: 'saving that detail',
};

function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] || tool.replace(/_/g, ' ');
}

type CopyState = 'idle' | 'copied' | 'error';

/**
 * Icon-only copy affordance shown beneath a completed assistant message.
 * Copies the raw message text (not the auto-linked markup). Mirrors the
 * site's canonical copy pattern (content_copy → check → error_outline,
 * see McpInstallBadge) but rendered subtly for a dense chat thread.
 */
function CopyMessageButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  // Messages unmount on clear / navigation — drop any pending revert timer
  // so we never setState on an unmounted component.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('error');
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), 1800);
  };

  const icon = state === 'copied' ? 'check' : state === 'error' ? 'error_outline' : 'content_copy';

  return (
    <div className="flex">
      {/* Hover-revealed (group on the message column): hidden at rest, shown on
          hover OR keyboard focus-within, and always shown on touch (no-hover)
          devices where hover never fires. opacity (not display) keeps it in the a11y
          tree + reserves layout space, so revealing it causes no shift. While showing
          the copied/failed result it stays visible regardless of hover.
          Accessible name stays static; the polite live region below is the single
          channel for the transient copied/failed outcome (avoids double-announce). */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy message"
        title="Copy message"
        className={`inline-flex items-center justify-center -ml-1 min-h-[32px] min-w-[32px] rounded-md transition-all duration-200 touch-manipulation active:scale-[0.98] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-altivum-gold focus-visible:outline-offset-2 ${
          state === 'idle'
            ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 text-altivum-silver/40 hover:text-altivum-gold'
            : 'opacity-100 text-altivum-gold'
        }`}
      >
        <Icon name={icon} className="text-base leading-none" aria-hidden="true" />
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'copied' ? 'Message copied to clipboard' : state === 'error' ? 'Copy failed' : ''}
      </span>
    </div>
  );
}

// Map of keywords to their URLs (ordered by length desc to match longer phrases first).
// `wholeWord: true` requires \b...\b boundaries AND case-sensitive matching — use it for
// short, dictionary-substring product names like "Elo" to avoid linking "developed"/"below".
const linkMap: { keyword: string; url: string; wholeWord?: boolean }[] = [
  { keyword: 'Beyond the Assessment', url: 'https://altivum.ai/bta' },
  { keyword: 'The Vector Podcast', url: 'https://www.youtube.com/@thevectorpodcast' },
  { keyword: 'Vector Podcast', url: 'https://www.youtube.com/@thevectorpodcast' },
  { keyword: 'Altivum Inc', url: 'https://altivum.ai' },
  { keyword: 'Altivum', url: 'https://altivum.ai' },
  { keyword: 'VetROI', url: 'https://vetroi.altivum.ai' },
  { keyword: 'Elo', url: 'https://elo.altivum.ai', wholeWord: true },
];

/**
 * Process text content and replace keywords with hyperlinks
 */
function processContentWithLinks(content: string): ReactNode[] {
  const result: ReactNode[] = [];
  let remainingText = content;
  let keyIndex = 0;

  while (remainingText.length > 0) {
    // Find the earliest match among all keywords
    let earliestMatch: { index: number; keyword: string; url: string } | null = null;

    for (const { keyword, url, wholeWord } of linkMap) {
      let index: number;
      if (wholeWord) {
        // Case-sensitive, boundary-anchored match (e.g. "Elo" must not match "developed").
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`\\b${escaped}\\b`).exec(remainingText);
        index = match ? match.index : -1;
      } else {
        index = remainingText.toLowerCase().indexOf(keyword.toLowerCase());
      }
      if (index !== -1 && (earliestMatch === null || index < earliestMatch.index)) {
        // Get the actual text from the content (preserves original casing)
        const actualKeyword = remainingText.substring(index, index + keyword.length);
        earliestMatch = { index, keyword: actualKeyword, url };
      }
    }

    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        result.push(remainingText.substring(0, earliestMatch.index));
      }

      // Add the link
      result.push(
        <a
          key={`link-${keyIndex++}`}
          href={earliestMatch.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-altivum-gold/50 hover:decoration-altivum-gold transition-colors"
        >
          {earliestMatch.keyword}
        </a>,
      );

      // Continue with remaining text
      remainingText = remainingText.substring(earliestMatch.index + earliestMatch.keyword.length);
    } else {
      // No more matches, add the rest of the text
      result.push(remainingText);
      break;
    }
  }

  return result;
}

const ChatMessage = memo(
  ({
    role,
    content,
    isStreaming,
    isSystem,
    drafts,
    uiBlocks,
    toolActivity,
    memoryEvents,
    surface = 'widget',
  }: ChatMessageProps) => {
    const isUser = role === 'user';

    const displayContent = useMemo(
      () => (isUser || isSystem ? content : processContentWithLinks(content)),
      [content, isUser, isSystem],
    );

    if (isSystem) {
      return (
        <div className="flex justify-center animate-fade-in">
          <div className="max-w-[90%] md:max-w-[80%] px-5 py-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-altivum-silver flex items-start gap-2" style={typography.bodyText}>
              <Icon name="info" className="text-altivum-silver/60 text-lg mt-0.5 shrink-0" />
              <span>{content}</span>
            </p>
          </div>
        </div>
      );
    }

    const activeTool = toolActivity?.find((t) => t.status === 'invoked');

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
        <div className="group flex flex-col gap-3 max-w-full" style={{ maxWidth: '100%' }}>
          {!isUser && activeTool ? (
            <div
              className="max-w-[90%] md:max-w-[80%] px-3 py-2 bg-white/5 border border-altivum-gold/20 rounded-xl"
              role="status"
              aria-live="polite"
            >
              <p className="text-altivum-silver flex items-center gap-2" style={typography.smallText}>
                <Icon name="hourglass_empty" className="text-altivum-gold/70 text-sm animate-pulse" />
                <span>Alti is {toolLabel(activeTool.tool)}…</span>
              </p>
            </div>
          ) : null}

          {content || (!isUser && isStreaming) ? (
            <div
              className={`max-w-[90%] md:max-w-[80%] px-5 py-4 ${
                isUser
                  ? 'bg-white/5 border border-white/30 rounded-2xl rounded-br-sm'
                  : 'bg-white/5 border border-altivum-gold/30 rounded-2xl rounded-bl-sm'
              }`}
            >
              <p className={isUser ? 'text-white' : 'text-altivum-gold'} style={typography.bodyText}>
                {displayContent}
                {isStreaming && (
                  <span
                    className="inline-block w-[2px] h-[1em] bg-altivum-gold ml-0.5 animate-pulse align-middle"
                    aria-hidden="true"
                  />
                )}
              </p>
            </div>
          ) : null}

          {!isUser && !isStreaming && content.trim().length > 0 ? <CopyMessageButton text={content} /> : null}

          {!isUser && surface === 'page' && uiBlocks && uiBlocks.length > 0 ? (
            <GenerativeBlocks blocks={uiBlocks} />
          ) : null}

          {!isUser && memoryEvents && memoryEvents.length > 0
            ? memoryEvents.map((evt, idx) => (
                <div
                  key={`mem-${idx}`}
                  className="max-w-[90%] md:max-w-[80%] px-3 py-2 bg-white/5 border border-white/10 rounded-xl"
                  role="status"
                >
                  <p className="text-altivum-silver flex items-center gap-2" style={typography.smallText}>
                    <Icon name="bookmark_added" className="text-altivum-gold/70 text-sm" />
                    <span>
                      {evt.action === 'remembered' ? 'Saved that for next time.' : 'Cleared what I had saved.'}
                    </span>
                  </p>
                </div>
              ))
            : null}

          {!isUser && drafts && drafts.length > 0
            ? drafts.map((d, idx) => <ToolDraftCard key={`draft-${idx}`} action={d} />)
            : null}
        </div>
      </div>
    );
  },
);

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
