/**
 * RSS Feed Generator Script
 * Fetches blog posts from Sanity and generates dist/rss.xml
 * Run after vite build + generate-sitemap: node scripts/generate-rss.js
 *
 * This script runs LAST in the `build` chain, which is why the RSS/sitemap
 * parity gate (VAL-SEO-009 / VAL-CROSS-005) lives here rather than in
 * validate-prerender-seo.mjs: that step runs BEFORE both generators on a dist/
 * vite has just emptied, so its copy of the check found no rss.xml and no
 * sitemap.xml and skipped itself silently on every build it ever ran.
 */

import { writeFileSync, readFileSync, existsSync, realpathSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createBuildClient, SITE_URL } from './lib/sanity-build-client.js';
import { BLOG_POSTS_FILTER } from './generate-sitemap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = createBuildClient();

const FEED_TITLE = 'Christian Perez - Blog';
const FEED_DESCRIPTION =
  'Thoughts on leadership, technology, veteran entrepreneurship, and building Altivum Inc. By Christian Perez (@thechrisgrey).';
const FEED_AUTHOR = 'Christian Perez';
const FEED_EMAIL = 'admin@altivum.ai';

/**
 * The feed's post set is BLOG_POSTS_FILTER — the same filter + ordering the
 * sitemap and the prerender crawl compose their own projections onto — so the
 * three artifacts cannot describe different sets of posts. Only the projection
 * is local to the feed. `category` is singular and may be a reference or a
 * plain string, exactly as src/sanity/queries.ts reads it.
 */
export const RSS_POSTS_QUERY = `${BLOG_POSTS_FILTER} {
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    _updatedAt,
    "category": coalesce(category->title, category)
  }`;

/**
 * Fetch all published blog posts from Sanity
 */
async function fetchBlogPosts() {
  try {
    const posts = await client.fetch(RSS_POSTS_QUERY);
    return posts;
  } catch (error) {
    console.error('Error fetching posts from Sanity:', error);
    process.exit(1);
  }
}

/**
 * Code points XML 1.0 forbids in document content. They cannot be represented
 * at all — not even as numeric character references — so a title or excerpt
 * pasted out of a PDF or Word doc (which carry them routinely) would produce a
 * feed every subscriber's reader rejects while the build still exits 0.
 *
 * no-control-regex is disabled deliberately: the rule exists to catch control
 * characters written into a pattern by accident, and matching them is the
 * entire purpose of this one.
 */
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/**
 * Escape XML special characters. Strips XML-illegal control characters FIRST,
 * because entity-escaping them is not an option (see XML_ILLEGAL_CHARS).
 */
export function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(XML_ILLEGAL_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format a date to RFC 822 for RSS, or null when the input is missing or
 * unparseable. Returning null rather than `new Date(x).toUTCString()` is the
 * point: on garbage input that expression returns the literal string
 * "Invalid Date", which sails into <pubDate> unnoticed.
 */
export function formatRssDate(dateString) {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  return d.toUTCString();
}

/**
 * The <pubDate> for a post. Falls back to the document's own _updatedAt when
 * publishedAt is missing or unparseable — NOT to `new Date()`, which changes on
 * every build and makes readers (which key item identity and ordering off
 * pubDate) resurface the item as new after every deploy. That is the same
 * cross-build determinism rule generate-sitemap.js keeps for <lastmod>
 * (VAL-SEO-003). With neither date usable the build fails rather than shipping
 * an item no reader can order.
 */
export function postPubDate(post) {
  const published = formatRssDate(post.publishedAt);
  if (published) return published;

  const updated = formatRssDate(post._updatedAt);
  if (updated) {
    console.warn(
      `[rss] WARN post "${post.slug}" has no usable publishedAt (${JSON.stringify(post.publishedAt)}) — using _updatedAt`,
    );
    return updated;
  }
  throw new Error(`Post "${post.slug}" has neither a usable publishedAt nor _updatedAt — cannot emit <pubDate>`);
}

/**
 * Categories for a post as an array. The schema's field is the singular
 * `category`; the previous `categories[]->title` projection matched no field on
 * any post, so every item shipped a blank line where its <category> belonged.
 */
export function postCategories(post) {
  return [post.category].filter((c) => typeof c === 'string' && c.trim() !== '');
}

/**
 * Generate RSS item for a single post
 */
export function generateRssItem(post) {
  const link = `${SITE_URL}/blog/${post.slug}`;
  const lines = [
    '    <item>',
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${link}</link>`,
    `      <guid isPermaLink="true">${link}</guid>`,
    `      <pubDate>${postPubDate(post)}</pubDate>`,
    `      <description>${escapeXml(post.excerpt || '')}</description>`,
  ];
  for (const category of postCategories(post)) {
    lines.push(`      <category>${escapeXml(category)}</category>`);
  }
  lines.push('    </item>');
  return lines.join('\n');
}

/**
 * Well-formedness check for the assembled feed, run before it is written.
 * Deliberately hand-rolled rather than pulling in an XML parser: it has to
 * catch exactly the three ways this generator can emit an unparseable document
 * (an illegal control character, a raw `&`/`<` escapeXml missed, an unbalanced
 * tag from a template edit), and a build script should not take a runtime
 * dependency to do that. Returns an error string, or null when clean.
 */
export function xmlWellFormednessError(xml) {
  const illegal = xml.match(XML_ILLEGAL_CHARS);
  if (illegal) {
    return `document contains ${illegal.length} XML-illegal control character(s)`;
  }

  const ampRe = /&/g;
  let amp;
  while ((amp = ampRe.exec(xml)) !== null) {
    const tail = xml.slice(amp.index, amp.index + 16);
    if (!/^&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/.test(tail)) {
      return `unescaped '&' at offset ${amp.index}: ${JSON.stringify(tail)}`;
    }
  }

  const stack = [];
  const tagRe = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*)>/g;
  let tag;
  while ((tag = tagRe.exec(xml)) !== null) {
    const [, closing, name, attrs] = tag;
    if (closing) {
      const open = stack.pop();
      if (open !== name) {
        return `unbalanced tag: </${name}> closes <${open ?? 'nothing'}>`;
      }
    } else if (!attrs.trimEnd().endsWith('/')) {
      stack.push(name);
    }
  }
  if (stack.length > 0) {
    return `unclosed tag(s): ${stack.join(', ')}`;
  }

  return null;
}

/** Blog slugs referenced by `tag` elements (<link> in RSS, <loc> in the sitemap). */
export function blogSlugsFrom(xml, tag) {
  const urls = [...xml.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g'))].map((m) => m[1].trim());
  return new Set(
    urls
      .filter((url) => url.includes('/blog/'))
      .map((url) => url.replace(/^https?:\/\/[^/]+\/blog\//, '').replace(/\/$/, '')),
  );
}

/**
 * VAL-SEO-009 / VAL-CROSS-005: the feed's blog set must equal the sitemap's.
 * Returns an error string, or null when the two agree.
 */
export function feedSitemapMismatch(rssXml, sitemapXml) {
  const rssSlugs = blogSlugsFrom(rssXml, 'link');
  const sitemapSlugs = blogSlugsFrom(sitemapXml, 'loc');
  const inRssNotSitemap = [...rssSlugs].filter((s) => !sitemapSlugs.has(s));
  const inSitemapNotRss = [...sitemapSlugs].filter((s) => !rssSlugs.has(s));
  if (inRssNotSitemap.length === 0 && inSitemapNotRss.length === 0) return null;
  return (
    `RSS/sitemap blog set mismatch: in RSS not sitemap: [${inRssNotSitemap.join(', ')}]; ` +
    `in sitemap not RSS: [${inSitemapNotRss.join(', ')}]`
  );
}

/**
 * Generate the complete RSS feed
 */
async function generateRssFeed() {
  console.log('Generating RSS feed...');

  const posts = await fetchBlogPosts();
  console.log(`Found ${posts.length} blog posts`);

  if (posts.length === 0) {
    console.error('No posts found — RSS generation failed (expected at least one post)');
    process.exit(1);
  }

  const lastBuildDate = formatRssDate(new Date().toISOString());
  const items = posts.map(generateRssItem).join('\n');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>${FEED_EMAIL} (${FEED_AUTHOR})</managingEditor>
    <webMaster>${FEED_EMAIL} (${FEED_AUTHOR})</webMaster>
    <image>
      <url>${SITE_URL}/tcg.png</url>
      <title>${escapeXml(FEED_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>
${items}
  </channel>
</rss>
`;

  const malformed = xmlWellFormednessError(rssFeed);
  if (malformed) {
    console.error(`RSS generation failed — assembled feed is not well-formed XML: ${malformed}`);
    process.exit(1);
  }

  // VAL-SEO-009 / VAL-CROSS-005, enforced HERE because this is the first point
  // in the build where both artifacts exist on disk. A missing sitemap.xml is a
  // hard failure, not a skip: a gate that silently examines nothing is exactly
  // what this check was moved out of validate-prerender-seo.mjs to escape.
  const sitemapPath = resolve(__dirname, '../dist/sitemap.xml');
  if (!existsSync(sitemapPath)) {
    console.error(
      `RSS generation failed — ${sitemapPath} not found, so the RSS/sitemap parity gate cannot run. ` +
        'Run `node scripts/generate-sitemap.js` first (the build chain does).',
    );
    process.exit(1);
  }
  const mismatch = feedSitemapMismatch(rssFeed, readFileSync(sitemapPath, 'utf-8'));
  if (mismatch) {
    console.error(`RSS generation failed — ${mismatch} (VAL-SEO-009)`);
    console.error(
      'Most often a post was published between the sitemap and RSS fetches; re-run the build to resync the two.',
    );
    process.exit(1);
  }

  // Write to dist folder
  const outputPath = resolve(__dirname, '../dist/rss.xml');
  writeFileSync(outputPath, rssFeed, 'utf-8');

  console.log(`RSS feed generated successfully at ${outputPath}`);
  console.log(`Total items: ${posts.length}`);
}

// Run the generator only when executed directly (`node scripts/generate-rss.js`),
// mirroring generate-sitemap.js so the test suite can import the pure helpers
// without triggering a Sanity fetch and a dist/ write as an import side effect.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  generateRssFeed().catch((err) => {
    console.error('RSS generation failed:', err);
    process.exit(1);
  });
}
