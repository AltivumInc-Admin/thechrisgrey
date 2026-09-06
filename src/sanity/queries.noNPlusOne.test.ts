import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLOG_LISTING_QUERY, POST_BY_SLUG_QUERY, PODCAST_GUESTS_QUERY } from './queries';

// N+1 query detection for the frontend's Sanity CMS data access.
//
// The frontend reads blog/podcast content from Sanity via GROQ. The N+1 risk
// is: fetch a list of posts, then issue a separate fetch per post to get its
// tags/series/relatedPosts. The prevention strategy is single batched GROQ
// queries that dereference ALL related data in-query (via the `->` and `[]`
// operators), so each view requires exactly ONE client.fetch call.
//
// These tests assert that contract three ways:
//   1. Structurally - each query dereferences related references in-query.
//   2. No bare refs - no reference array is projected without `->`.
//   3. Call sites - every page fetch passes a known batched query constant,
//      never an ad-hoc per-item query.
//
// A fourth way used to be advertised - "an instrumented client sees exactly one
// fetch per view" - but nothing was instrumented: the helper built a local stub,
// the test called it once, and asserted it had been called once. It would have
// stayed green through the very refactor it claimed to catch. The real per-render
// fetch count belongs in the page integration test, where an actual component is
// rendered; see Blog.integration.test.tsx.

/** The three batched query constants the pages must fetch through. */
const BATCHED_QUERIES = new Set(['BLOG_LISTING_QUERY', 'POST_BY_SLUG_QUERY', 'PODCAST_GUESTS_QUERY']);

/** Page components that fetch from Sanity. */
const PAGES = ['src/pages/Blog.tsx', 'src/pages/BlogPost.tsx', 'src/pages/Podcast.tsx'];

/** Read a page source relative to the repo root (vitest runs at repo root). */
function readPage(page: string): string {
  return readFileSync(join(process.cwd(), page), 'utf8');
}

describe('frontend Sanity N+1 detection - each view is a single batched GROQ query', () => {
  it('BLOG_LISTING_QUERY joins posts + tags + series + category in one query', () => {
    // One post filter -> one fetch. Related data is dereferenced in-query.
    expect(BLOG_LISTING_QUERY).toContain('_type == "post"');
    expect(BLOG_LISTING_QUERY).toContain('tags[]->');
    expect(BLOG_LISTING_QUERY).toContain('series->');
    expect(BLOG_LISTING_QUERY).toContain('category->title');
  });

  it('POST_BY_SLUG_QUERY joins body + tags + series + relatedPosts + seriesPosts in one query', () => {
    expect(POST_BY_SLUG_QUERY).toContain('body[]');
    expect(POST_BY_SLUG_QUERY).toContain('tags[]->');
    expect(POST_BY_SLUG_QUERY).toContain('series->');
    expect(POST_BY_SLUG_QUERY).toContain('relatedPosts[]->');
    // seriesPosts is computed by an in-query select subquery, not a follow-up fetch.
    expect(POST_BY_SLUG_QUERY).toContain('"seriesPosts"');
    expect(POST_BY_SLUG_QUERY).toMatch(/series\._ref/);
  });

  it('PODCAST_GUESTS_QUERY is a single query projecting all guest fields', () => {
    expect(PODCAST_GUESTS_QUERY).toContain('_type == "podcastGuest"');
    // Guests carry no document references, so one projection fetches everything.
    expect(PODCAST_GUESTS_QUERY).toContain('name');
    expect(PODCAST_GUESTS_QUERY).toContain('order');
  });
});

describe('frontend Sanity N+1 detection - no query returns bare references', () => {
  // A reference array projected without `->` (e.g. `tags[]` returning `{ _ref }`)
  // would force the frontend to fetch each referenced document separately (N+1).
  // Every array-of-references projection must dereference with `->`.
  it('BLOG_LISTING_QUERY dereferences every reference array', () => {
    expect(BLOG_LISTING_QUERY).toContain('tags[]->');
    // No bare `tags[]` immediately followed by something other than `->`.
    expect(BLOG_LISTING_QUERY).not.toMatch(/tags\[\](?!->)/);
  });

  it('POST_BY_SLUG_QUERY dereferences every reference array', () => {
    expect(POST_BY_SLUG_QUERY).toContain('tags[]->');
    expect(POST_BY_SLUG_QUERY).toContain('relatedPosts[]->');
    expect(POST_BY_SLUG_QUERY).not.toMatch(/tags\[\](?!->)/);
    expect(POST_BY_SLUG_QUERY).not.toMatch(/relatedPosts\[\](?!->)/);
  });

  it('dereference projections include _id (related docs fully fetched in-query, not as refs)', () => {
    expect(BLOG_LISTING_QUERY).toMatch(/tags\[\]->\{[^}]*_id/);
    expect(BLOG_LISTING_QUERY).toMatch(/series->\{[^}]*_id/);
    expect(POST_BY_SLUG_QUERY).toMatch(/relatedPosts\[\]->\{[^}]*_id/);
  });
});

describe('frontend Sanity N+1 detection - page call sites use batched query constants', () => {
  // The genuine call-site N+1 risk: a page iterating a collection and calling
  // client.fetch inside the loop with an ad-hoc per-item query. Asserting every
  // fetch passes a known batched query constant catches that - an inline
  // per-item query would not match any of the three constants.
  /** Extract the first identifier argument from every `.fetch(...)` call in source. */
  function fetchArguments(source: string): string[] {
    const re = /\.fetch\s*(?:<[^>]*>)?\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/g;
    const args: string[] = [];
    for (const m of source.matchAll(re)) {
      if (m[1]) args.push(m[1]);
    }
    return args;
  }

  for (const page of PAGES) {
    it(`${page}: every fetch passes a known batched query constant`, () => {
      const args = fetchArguments(readPage(page));
      expect(args.length, `${page} must fetch from Sanity at least once`).toBeGreaterThan(0);
      for (const arg of args) {
        expect(
          BATCHED_QUERIES.has(arg),
          `${page} fetch argument "${arg}" must be one of the batched query constants ${[...BATCHED_QUERIES].join(', ')}`,
        ).toBe(true);
      }
    });

    it(`${page}: no client.fetch inside an iteration loop (no N+1 call site)`, () => {
      const src = readPage(page);
      // A multi-line regex: an iteration callback/body (.map/.forEach/for/while)
      // that contains a `.fetch(` before its body closes. The negative lookahead
      // stops the match at the first body close, so a rendering `.map` that
      // closed earlier won't match a fetch that lives in a separate function.
      const fetchInMapForEach =
        /\.(?:map|forEach)\s*\((?:(?!\)\s*[,;)\n])(?!\.fetch)[\s\S])*?\.fetch\s*(?:<[^>]*>)?\s*\(/s;
      const fetchInForWhile =
        /\b(?:for|while)\s*\([^)]*\)\s*\{(?:(?!\})(?!\.fetch)[\s\S])*?\.fetch\s*(?:<[^>]*>)?\s*\(/s;
      expect(src, `${page} must not call .fetch inside a .map/.forEach callback`).not.toMatch(fetchInMapForEach);
      expect(src, `${page} must not call .fetch inside a for/while body`).not.toMatch(fetchInForWhile);
    });
  }

  it('Blog.tsx hover prefetch is the only second fetch and is cache-guarded (on-demand, not N+1)', () => {
    const src = readPage('src/pages/Blog.tsx');
    // The listing fetch + the hover prefetch are the two fetch sites. The hover
    // prefetch is an event handler guarded by getPostCache(slug), so each slug
    // is fetched at most once on demand - not a loop over the listing.
    const args = src.match(/\.fetch\s*(?:<[^>]*>)?\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/g) ?? [];
    expect(args.length).toBe(2);
    expect(src).toContain('getPostCache');
    expect(src).toContain('prefetchedSlugs');
  });
});
