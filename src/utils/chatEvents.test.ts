import { describe, it, expect } from 'vitest';
import { createChatStreamParser, EVT_DELIM, SYS_DELIM } from './chatEvents';

function wrapEvent(obj: unknown): string {
  return `${EVT_DELIM}${JSON.stringify(obj)}${EVT_DELIM}`;
}

describe('createChatStreamParser', () => {
  it('emits plain text chunks as text', () => {
    const p = createChatStreamParser();
    const out = p.push('Hello ');
    expect(out).toEqual([{ kind: 'text', text: 'Hello ' }]);
  });

  it('buffers and emits a complete event', () => {
    const p = createChatStreamParser();
    const payload = { kind: 'tool_invocation', tool: 'navigate_to' };
    const out = p.push(`before ${wrapEvent(payload)}after`);
    expect(out).toContainEqual({ kind: 'text', text: 'before ' });
    expect(out).toContainEqual({ kind: 'event', event: payload });
    expect(out).toContainEqual({ kind: 'text', text: 'after' });
  });

  it('holds an incomplete event across pushes', () => {
    const p = createChatStreamParser();
    const payload = { kind: 'tool_result', tool: 'navigate_to', status: 'success' };
    const encoded = wrapEvent(payload);
    const mid = Math.floor(encoded.length / 2);
    const first = p.push(`hello ${encoded.slice(0, mid)}`);
    expect(first).toEqual([{ kind: 'text', text: 'hello ' }]);
    const second = p.push(encoded.slice(mid));
    expect(second).toContainEqual({ kind: 'event', event: payload });
  });

  it('handles multiple events in one chunk', () => {
    const p = createChatStreamParser();
    const a = { kind: 'tool_invocation', tool: 'navigate_to' };
    const b = { kind: 'tool_result', tool: 'navigate_to', status: 'success' };
    const out = p.push(`${wrapEvent(a)}${wrapEvent(b)}done`);
    expect(out).toContainEqual({ kind: 'event', event: a });
    expect(out).toContainEqual({ kind: 'event', event: b });
    expect(out).toContainEqual({ kind: 'text', text: 'done' });
  });

  it('emits system message and stops text flow after SYS delim', () => {
    const p = createChatStreamParser();
    const out = p.push(`partial text ${SYS_DELIM}Rate limited.`);
    expect(out).toContainEqual({ kind: 'text', text: 'partial text ' });
    expect(out).toContainEqual({ kind: 'system', text: 'Rate limited.' });
  });

  it('handles draft_action contact event', () => {
    const p = createChatStreamParser();
    const payload = {
      kind: 'draft_action',
      action: 'contact',
      subject: 'Podcast invite',
      body: 'Long body',
      intent: 'podcast',
    };
    const out = p.push(wrapEvent(payload));
    expect(out).toContainEqual({ kind: 'event', event: payload });
  });

  it('round-trips a draft_action podcast_citation event', () => {
    const p = createChatStreamParser();
    const payload = {
      kind: 'draft_action',
      action: 'podcast_citation',
      videoId: 'ndX9SkIY7Mc',
      startSeconds: 725,
      episodeTitle: 'Brittinie Wick on Women Veterans',
      quote: 'Women veterans are too often invisible after service.',
      timestampLabel: '12:05',
      url: 'https://www.youtube.com/watch?v=ndX9SkIY7Mc&t=725s',
    };
    const out = p.push(wrapEvent(payload));
    expect(out).toContainEqual({ kind: 'event', event: payload });
  });

  it('falls back to text when event JSON is invalid', () => {
    const p = createChatStreamParser();
    const out = p.push(`${EVT_DELIM}not json${EVT_DELIM}`);
    expect(out).toContainEqual({ kind: 'text', text: 'not json' });
  });

  it('flush emits nothing once push has already drained the buffer', () => {
    const p = createChatStreamParser();
    const drained = p.push(`leading ${EVT_DELIM}{"kind":"tool_invocation","tool":"x"}${EVT_DELIM}tail`);
    expect(drained).toContainEqual({ kind: 'text', text: 'tail' });
    expect(p.flush()).toEqual([]);
  });

  it('flush discards an unterminated event frame instead of rendering it as prose', () => {
    // A stream cut mid-frame (agent timeout, dropped connection, client abort)
    // leaves the opening delimiter plus half a JSON object in the buffer. Emitting
    // that as text painted the raw delimiters into the assistant bubble, persisted
    // them, and replayed them to the model as an assistant turn on the next send.
    const p = createChatStreamParser();
    const visible = p.push(`hi there ${EVT_DELIM}{"kind":"draft_ac`);
    expect(visible).toEqual([{ kind: 'text', text: 'hi there ' }]);

    const tail = p.flush();
    expect(tail).toEqual([]);
  });

  it('flush keeps the prose in front of a truncated delimiter and drops the rest', () => {
    // A delimiter split across chunk boundaries: push() holds the whole buffer
    // because it cannot yet tell prose from the start of a frame.
    const p = createChatStreamParser();
    expect(p.push('final words\x00SY')).toEqual([]);

    const tail = p.flush();
    expect(tail).toEqual([{ kind: 'text', text: 'final words' }]);
  });

  it('never emits a NUL byte in visible text', () => {
    const p = createChatStreamParser();
    const emitted = [...p.push(`prose ${SYS_DELIM.slice(0, 2)}`), ...p.flush()];
    for (const part of emitted) {
      if (part.kind !== 'event') expect(part.text).not.toContain('\x00');
    }
  });

  it('drops a well-formed frame whose kind is not a known event', () => {
    const p = createChatStreamParser();
    const out = p.push(wrapEvent({ kind: 'not_a_real_event', payload: 'x' }));
    expect(out).toEqual([]);
  });

  it('drops a draft_action whose card fields are missing', () => {
    // ToolDraftCard dereferences each variant's fields unguarded — a
    // blog_search_results without `results` would throw on `.results.length`.
    const p = createChatStreamParser();
    expect(p.push(wrapEvent({ kind: 'draft_action', action: 'blog_search_results', query: 'ai' }))).toEqual([]);
    expect(p.push(wrapEvent({ kind: 'draft_action', action: 'navigate', reason: 'no path' }))).toEqual([]);
    expect(p.push(wrapEvent({ kind: 'draft_action', action: 'teleport', path: '/podcast' }))).toEqual([]);
  });

  it('still accepts every draft variant the backend actually emits', () => {
    const p = createChatStreamParser();
    const results = { kind: 'draft_action', action: 'blog_search_results', query: 'ai', results: [] };
    expect(p.push(wrapEvent(results))).toContainEqual({ kind: 'event', event: results });
    const memory = { kind: 'memory_update', action: 'remembered', content: 'likes coffee' };
    expect(p.push(wrapEvent(memory))).toContainEqual({ kind: 'event', event: memory });
    const block = { kind: 'ui_block', block: { type: 'stat_row', stats: [] } };
    expect(p.push(wrapEvent(block))).toContainEqual({ kind: 'event', event: block });
  });

  it('buffers a bare EVT start byte across pushes', () => {
    const p = createChatStreamParser();
    const first = p.push('visible');
    expect(first).toEqual([{ kind: 'text', text: 'visible' }]);
    const second = p.push(`\x00EV`);
    expect(second).toEqual([]);
    const third = p.push(`T\x00{"kind":"guardrail"}${EVT_DELIM}`);
    expect(third).toContainEqual({ kind: 'event', event: { kind: 'guardrail' } });
  });
});
