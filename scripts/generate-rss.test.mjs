import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  escapeXml,
  formatRssDate,
  postPubDate,
  postCategories,
  generateRssItem,
  xmlWellFormednessError,
  blogSlugsFrom,
  feedSitemapMismatch,
  RSS_POSTS_QUERY,
} from './generate-rss.js';
import { BLOG_POSTS_FILTER, BLOG_SLUGS_QUERY } from './generate-sitemap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// U+000B (vertical tab) is the control character a title pasted out of a PDF or
// Word doc carries most often. XML 1.0 cannot represent it at all.
const VERTICAL_TAB = '\u000B';

const post = (overrides = {}) => ({
  title: 'A Post',
  slug: 'a-post',
  excerpt: 'An excerpt.',
  publishedAt: '2024-05-01T12:00:00Z',
  _updatedAt: '2024-06-01T12:00:00Z',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('escapeXml', () => {
  it('escapes the five predefined entities', () => {
    expect(escapeXml(`Tom & Jerry <b> "q" 'a'`)).toBe('Tom &amp; Jerry &lt;b&gt; &quot;q&quot; &apos;a&apos;');
  });

  it('escapes an ampersand that already opens an entity, so the text round-trips', () => {
    expect(escapeXml('AT&amp;T')).toBe('AT&amp;amp;T');
  });

  it('strips control characters XML 1.0 forbids outright', () => {
    expect(escapeXml(`Quantum${VERTICAL_TAB}Computing\u0000\u001F`)).toBe('QuantumComputing');
  });

  it('keeps tab, newline and carriage return, which XML does allow', () => {
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });

  it('returns an empty string for missing text', () => {
    expect(escapeXml(undefined)).toBe('');
    expect(escapeXml(null)).toBe('');
  });
});

describe('formatRssDate', () => {
  it('formats a valid ISO date as RFC 822', () => {
    expect(formatRssDate('2024-05-01T12:00:00Z')).toBe('Wed, 01 May 2024 12:00:00 GMT');
  });

  it('returns null rather than the literal string "Invalid Date" for unparseable input', () => {
    expect(formatRssDate('2024-13-45')).toBeNull();
    expect(formatRssDate('not a date')).toBeNull();
  });

  it('returns null for missing input', () => {
    expect(formatRssDate(undefined)).toBeNull();
    expect(formatRssDate('')).toBeNull();
  });
});

describe('postPubDate', () => {
  it('uses publishedAt when it parses', () => {
    expect(postPubDate(post())).toBe('Wed, 01 May 2024 12:00:00 GMT');
  });

  it('falls back to _updatedAt when publishedAt is missing, not to the build time', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const value = postPubDate(post({ publishedAt: undefined }));
    expect(value).toBe('Sat, 01 Jun 2024 12:00:00 GMT');
    // Deterministic across builds: two calls agree, unlike `new Date()`.
    expect(postPubDate(post({ publishedAt: undefined }))).toBe(value);
  });

  it('falls back to _updatedAt when publishedAt is unparseable', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(postPubDate(post({ publishedAt: '2024-13-45' }))).toBe('Sat, 01 Jun 2024 12:00:00 GMT');
  });

  it('throws when neither date is usable rather than emitting "Invalid Date"', () => {
    expect(() => postPubDate(post({ publishedAt: null, _updatedAt: null }))).toThrow(/publishedAt/);
  });
});

describe('postCategories', () => {
  it('reads the singular `category` field the post schema actually has', () => {
    expect(postCategories(post({ category: 'Engineering' }))).toEqual(['Engineering']);
  });

  it('returns nothing for a post with no category', () => {
    expect(postCategories(post())).toEqual([]);
    expect(postCategories(post({ category: '   ' }))).toEqual([]);
  });
});

describe('generateRssItem', () => {
  it('emits no <category> element and no blank line for a post with no categories', () => {
    const item = generateRssItem(post());
    expect(item).not.toContain('<category>');
    expect(item.split('\n').some((line) => line.trim() === '')).toBe(false);
  });

  it('emits one <category> per category', () => {
    expect(generateRssItem(post({ category: 'Engineering' }))).toContain('<category>Engineering</category>');
  });

  it('emits an empty description for a post with no excerpt', () => {
    expect(generateRssItem(post({ excerpt: undefined }))).toContain('<description></description>');
  });

  it('produces well-formed XML for a title carrying markup and a control character', () => {
    const item = generateRssItem(post({ title: `Quantum${VERTICAL_TAB} & <Computing>` }));
    expect(xmlWellFormednessError(`<rss>${item}</rss>`)).toBeNull();
    expect(item).toContain('<title>Quantum &amp; &lt;Computing&gt;</title>');
  });
});

describe('xmlWellFormednessError', () => {
  it('accepts a well-formed document, including self-closing and namespaced tags', () => {
    expect(xmlWellFormednessError('<rss><atom:link href="x" rel="self"/><a>ok</a></rss>')).toBeNull();
  });

  it('rejects an XML-illegal control character', () => {
    expect(xmlWellFormednessError(`<a>x${VERTICAL_TAB}y</a>`)).toMatch(/control character/);
  });

  it('rejects a raw ampersand that opens no entity', () => {
    expect(xmlWellFormednessError('<a>Tom & Jerry</a>')).toMatch(/unescaped/);
  });

  it('accepts numeric and named character references', () => {
    expect(xmlWellFormednessError('<a>&amp; &#8217; &#x2019;</a>')).toBeNull();
  });

  it('rejects an unbalanced tag', () => {
    expect(xmlWellFormednessError('<a><b></a>')).toMatch(/unbalanced/);
  });

  it('rejects an unclosed tag', () => {
    expect(xmlWellFormednessError('<a><b></b>')).toMatch(/unclosed/);
  });
});

describe('RSS/sitemap parity (VAL-SEO-009)', () => {
  const rss = (...slugs) =>
    `<rss><channel><link>https://thechrisgrey.com/blog</link>${slugs
      .map((s) => `<item><link>https://thechrisgrey.com/blog/${s}</link></item>`)
      .join('')}</channel></rss>`;
  const sitemap = (...slugs) =>
    `<urlset><url><loc>https://thechrisgrey.com/about</loc></url>${slugs
      .map((s) => `<url><loc>https://thechrisgrey.com/blog/${s}</loc></url>`)
      .join('')}</urlset>`;

  it('extracts only blog slugs, ignoring the channel and static-route links', () => {
    expect([...blogSlugsFrom(rss('a', 'b'), 'link')]).toEqual(['a', 'b']);
    expect([...blogSlugsFrom(sitemap('a'), 'loc')]).toEqual(['a']);
  });

  it('returns null when the two sets agree regardless of order', () => {
    expect(feedSitemapMismatch(rss('a', 'b'), sitemap('b', 'a'))).toBeNull();
  });

  it('reports a post the feed has but the sitemap does not', () => {
    expect(feedSitemapMismatch(rss('a', 'b'), sitemap('a'))).toMatch(/in RSS not sitemap: \[b\]/);
  });

  it('reports a post the sitemap has but the feed does not', () => {
    expect(feedSitemapMismatch(rss('a'), sitemap('a', 'b'))).toMatch(/in sitemap not RSS: \[b\]/);
  });
});

describe('post-set drift with the sitemap', () => {
  it('composes the feed query onto the sitemap-owned filter', () => {
    expect(RSS_POSTS_QUERY.startsWith(BLOG_POSTS_FILTER)).toBe(true);
    expect(BLOG_SLUGS_QUERY.startsWith(BLOG_POSTS_FILTER)).toBe(true);
  });

  it('does not re-declare the post filter inline (the copy-paste that drifts)', () => {
    const source = readFileSync(resolve(__dirname, 'generate-rss.js'), 'utf-8');
    // The filter literal must live only in generate-sitemap.js. This is the
    // text-parsing drift idiom from src/routes.test.ts.
    expect(source).not.toMatch(/\*\[_type == "post"/);
    expect(source).toContain("import { BLOG_POSTS_FILTER } from './generate-sitemap.js'");
  });
});
