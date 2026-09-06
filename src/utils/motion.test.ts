import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { isMotionDisabled } from './motion';

describe('isMotionDisabled', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__;
  });

  it('returns false in a normal browser context with no reduced-motion preference', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    expect(isMotionDisabled()).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce matches', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    expect(isMotionDisabled()).toBe(true);
  });

  it('returns true when the build-time prerender flag is set, even with motion otherwise allowed', () => {
    // Critical SEO/AI-crawler invariant: prerender wins over the media query so
    // reveal components ship their final state into the static HTML.
    (window as unknown as { __PRERENDER__: boolean }).__PRERENDER__ = true;
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    expect(isMotionDisabled()).toBe(true);
  });

  it('returns true when the URL has ?prerender (matches isPrerender behavior)', () => {
    // The crawl falls back to a ?prerender URL param when it cannot set the
    // __PRERENDER__ global before navigation. isMotionDisabled inherits that
    // behavior through isPrerender().
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '?prerender=1' },
    });
    try {
      expect(isMotionDisabled()).toBe(true);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});

/**
 * Drift guard for the other half of the motion contract. `isMotionDisabled()`
 * covers only the components that ask; every `--animate-*` utility in the
 * `@theme` block runs purely in CSS and is neutralised — or silently is not —
 * by the `@media (prefers-reduced-motion: reduce)` block in src/index.css.
 * `.animate-shimmer` sat outside that block for six blog skeletons' worth of
 * bars, and nothing failed. index.css is read as TEXT (vitest runs with
 * `css: false`, so no stylesheet is loaded into jsdom to introspect).
 */
describe('reduced-motion coverage in index.css', () => {
  const CSS = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8');

  /** The `@media (prefers-reduced-motion: reduce)` body, brace-matched (it nests rules). */
  function reducedMotionBlock(): string {
    const start = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start, 'index.css must carry a prefers-reduced-motion block').toBeGreaterThan(-1);
    const open = CSS.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < CSS.length; i++) {
      if (CSS[i] === '{') depth++;
      else if (CSS[i] === '}' && --depth === 0) return CSS.slice(open + 1, i);
    }
    throw new Error('unbalanced braces in the prefers-reduced-motion block');
  }

  /** Every animation utility the `@theme` block defines: `--animate-shimmer: ...`. */
  function themeAnimationClasses(): string[] {
    return [...CSS.matchAll(/^\s*--animate-([a-z0-9-]+):/gm)].map((m) => `.animate-${m[1]}`);
  }

  it('declares at least one animation utility to check', () => {
    expect(themeAnimationClasses().length).toBeGreaterThan(0);
  });

  it('neutralises every @theme animation utility under prefers-reduced-motion', () => {
    const block = reducedMotionBlock();
    for (const selector of themeAnimationClasses()) {
      // Word-boundary match so `.animate-fade-in` never satisfies a lookup for
      // a future `.animate-fade` (or vice versa).
      const declared = new RegExp(`\\${selector}(?![a-z0-9-])`).test(block);
      expect(declared, `${selector} is animated but never stopped for reduced-motion visitors`).toBe(true);
    }
  });

  it('stops the skeleton shimmer specifically', () => {
    // The blog listing paints six skeletons of eleven shimmering bars each, so
    // this is the loudest motion a reduced-motion visitor would otherwise see.
    expect(reducedMotionBlock()).toMatch(/\.animate-shimmer\s*\{[^}]*animation:\s*none\s*!important/);
  });

  it("stops Tailwind's animate-pulse specifically", () => {
    // `.animate-pulse` ships with Tailwind rather than the @theme block above,
    // so the exhaustive check cannot reach it — but the streaming carets and
    // "thinking" indicators (ChatMessage, AskTheVector, TraceResponseBubble) and
    // blueprint/LoadingSkeleton all use it, and none of them gate on
    // isMotionDisabled(). Only the animation is stopped: forcing opacity or
    // transform here would stomp the layout classes those elements carry.
    expect(reducedMotionBlock()).toMatch(/\.animate-pulse\s*\{[^}]*animation:\s*none\s*!important/);
  });
});
