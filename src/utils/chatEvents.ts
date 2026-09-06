import type { UiBlock } from './uiBlocks';

export const SYS_DELIM = '\x00SYS\x00';
export const EVT_DELIM = '\x00EVT\x00';

export type DraftActionNavigate = {
  kind: 'draft_action';
  action: 'navigate';
  path: string;
  reason: string;
};

export type DraftActionContact = {
  kind: 'draft_action';
  action: 'contact';
  subject: string;
  body: string;
  intent: 'speaking' | 'podcast' | 'consulting' | 'collaboration' | 'media' | 'general';
};

export type DraftActionNewsletter = {
  kind: 'draft_action';
  action: 'newsletter';
  pitch: string;
};

export type DraftActionCitation = {
  kind: 'draft_action';
  action: 'citation';
  slug: string;
  title: string;
  excerpt: string;
  url: string;
};

export type BlogSearchResult = {
  slug: string;
  title: string;
  excerpt: string;
  url: string;
};

export type DraftActionBlogSearchResults = {
  kind: 'draft_action';
  action: 'blog_search_results';
  query: string;
  results: BlogSearchResult[];
};

export type DraftActionPodcastCitation = {
  kind: 'draft_action';
  action: 'podcast_citation';
  videoId: string;
  startSeconds: number;
  episodeTitle: string;
  quote: string;
  timestampLabel: string;
  url: string;
};

export type ToolInvocationEvent = {
  kind: 'tool_invocation';
  tool: string;
  toolUseId?: string;
};

export type ToolResultEvent = {
  kind: 'tool_result';
  tool: string;
  toolUseId?: string;
  status: string;
};

export type MemoryUpdateEvent = {
  kind: 'memory_update';
  action: 'remembered' | 'forgotten';
  content?: string;
  factId?: string;
};

export type GuardrailEvent = {
  kind: 'guardrail';
  reason?: string;
  stopReason?: string;
};

export type UiBlockEvent = {
  kind: 'ui_block';
  block: UiBlock;
};

export type DraftAction =
  | DraftActionNavigate
  | DraftActionContact
  | DraftActionNewsletter
  | DraftActionCitation
  | DraftActionBlogSearchResults
  | DraftActionPodcastCitation;

export type ChatEvent =
  DraftAction | ToolInvocationEvent | ToolResultEvent | MemoryUpdateEvent | GuardrailEvent | UiBlockEvent;

export type ParsedChunk =
  { kind: 'text'; text: string } | { kind: 'system'; text: string } | { kind: 'event'; event: ChatEvent };

type ParseState = {
  buffer: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// Per draft variant, the fields the matching ToolDraftCard branch dereferences
// without a guard of its own (`action.results.length`, `isInternalPath(path)`,
// the YouTube URL/offset). A card that renders on every page from unvalidated
// stream output has to be handed a shape it can survive.
const DRAFT_ACTION_GUARDS: Record<string, (event: Record<string, unknown>) => boolean> = {
  navigate: (e) => isNonEmptyString(e.path),
  contact: (e) => isNonEmptyString(e.subject) && typeof e.body === 'string',
  newsletter: (e) => typeof e.pitch === 'string',
  citation: (e) => isNonEmptyString(e.slug) && isNonEmptyString(e.url),
  blog_search_results: (e) => Array.isArray(e.results),
  podcast_citation: (e) => isNonEmptyString(e.videoId) && isNonEmptyString(e.url) && typeof e.startSeconds === 'number',
};

/**
 * Discriminate a parsed frame before it is trusted as a ChatEvent.
 *
 * The payload between two `\x00EVT\x00` delimiters is model-adjacent stream
 * output, and it used to be cast straight to ChatEvent — so an unknown `kind`
 * flowed into `msg.drafts` and reached ToolDraftCard, which dereferences each
 * variant's fields unguarded. Anything that fails here is dropped rather than
 * rendered: it is protocol residue, never prose.
 */
export function isChatEvent(value: unknown): value is ChatEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  switch (event.kind) {
    case 'draft_action': {
      const guard = typeof event.action === 'string' ? DRAFT_ACTION_GUARDS[event.action] : undefined;
      return guard ? guard(event) : false;
    }
    case 'tool_invocation':
    case 'tool_result':
      return isNonEmptyString(event.tool);
    case 'memory_update':
      return event.action === 'remembered' || event.action === 'forgotten';
    case 'guardrail':
      return true;
    case 'ui_block':
      return typeof event.block === 'object' && event.block !== null;
    default:
      return false;
  }
}

/**
 * Emit visible text with any NUL bytes removed. A NUL in rendered prose means a
 * delimiter was split or truncated; the byte itself renders as garbage, is
 * persisted to sessionStorage, and comes back as an assistant turn in the next
 * request's history.
 */
function pushText(out: ParsedChunk[], raw: string): void {
  const text = raw.replace(/\0/g, '');
  if (text) out.push({ kind: 'text', text });
}

export function createChatStreamParser(): {
  push: (chunk: string) => ParsedChunk[];
  flush: () => ParsedChunk[];
} {
  const state: ParseState = { buffer: '' };

  const drainEvents = (raw: string): { remainder: string; emitted: ParsedChunk[] } => {
    const emitted: ParsedChunk[] = [];
    let working = raw;

    for (;;) {
      const start = working.indexOf(EVT_DELIM);
      if (start === -1) break;
      if (start > 0) {
        emitted.push(...splitTextAndSystem(working.slice(0, start)));
      }
      const afterStart = start + EVT_DELIM.length;
      const end = working.indexOf(EVT_DELIM, afterStart);
      if (end === -1) {
        working = working.slice(start);
        return { remainder: working, emitted };
      }
      const payload = working.slice(afterStart, end);
      try {
        const parsed: unknown = JSON.parse(payload);
        // Well-formed JSON that is not a known event is dropped on the floor;
        // only unparseable payloads fall back to text (long-standing behaviour
        // for a delimiter pair that framed something that was never an event).
        if (isChatEvent(parsed)) emitted.push({ kind: 'event', event: parsed });
      } catch {
        pushText(emitted, payload);
      }
      working = working.slice(end + EVT_DELIM.length);
    }

    return { remainder: working, emitted };
  };

  return {
    push(chunk: string): ParsedChunk[] {
      state.buffer += chunk;
      const { remainder, emitted } = drainEvents(state.buffer);
      state.buffer = remainder;

      const systemIdx = state.buffer.indexOf(SYS_DELIM);
      if (systemIdx !== -1) {
        if (systemIdx > 0) pushText(emitted, state.buffer.slice(0, systemIdx));
        emitted.push({ kind: 'system', text: state.buffer.slice(systemIdx + SYS_DELIM.length) });
        state.buffer = '';
        return emitted;
      }

      if (!state.buffer.includes(EVT_DELIM[0]) && !state.buffer.includes(SYS_DELIM[0])) {
        pushText(emitted, state.buffer);
        state.buffer = '';
      }

      return emitted;
    },
    flush(): ParsedChunk[] {
      const leftover = state.buffer;
      state.buffer = '';
      if (!leftover) return [];
      // push() only ever retains a buffer that still holds a NUL: an
      // unterminated \x00EVT\x00 frame, or the first bytes of a delimiter split
      // across chunks. Everything from that NUL onward is half a frame, so emit
      // only the prose in front of it and discard the rest. Emitting the whole
      // buffer — what this used to do — painted `\x00EVT\x00{"kind":"draft_ac`
      // into the gold assistant bubble whenever a stream was cut mid-frame,
      // persisted it, and replayed it to the model on the next turn.
      const frameStart = leftover.indexOf('\0');
      const out: ParsedChunk[] = [];
      pushText(out, frameStart === -1 ? leftover : leftover.slice(0, frameStart));
      return out;
    },
  };
}

function splitTextAndSystem(raw: string): ParsedChunk[] {
  const out: ParsedChunk[] = [];
  const idx = raw.indexOf(SYS_DELIM);
  if (idx === -1) {
    pushText(out, raw);
    return out;
  }
  pushText(out, raw.slice(0, idx));
  out.push({ kind: 'system', text: raw.slice(idx + SYS_DELIM.length) });
  return out;
}
