/**
 * Build-time blog post preview generator (VAL-SD-004).
 *
 * Fetches every published blog post's slug + title from Sanity and writes
 * `src/data/generatedBlogPreviews.json`. The Blog listing page imports this
 * static file so the CollectionPage JSON-LD `hasPart` references each post's
 * Article URL in the PRERENDERED HTML — without waiting for the client-side
 * Sanity fetch (which completes after the prerender-ready signal fires, so the
 * posts array is empty during prerender).
 *
 * Mirrors the `generate-podcast-episodes.js` pattern: runs before `vite build`
 * so the JSON is bundled, and degrades gracefully (writes an empty array) if
 * Sanity is unreachable so the build never blocks on this step. The downstream
 * `generate-sitemap` step is fail-fast on Sanity, so a real outage still
 * surfaces there.
 *
 * Usage: node scripts/generate-blog-previews.js
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@sanity/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = createClient({
  projectId: 'k5950b3w',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  timeout: 15000,
});

// Only slug + title are needed for the CollectionPage hasPart references.
const QUERY = `*[_type == "post" && defined(slug.current)] | order(isFeatured desc, publishedAt desc) {
    title,
    "slug": slug.current
  }`;

async function main() {
  let posts = [];
  try {
    posts = await client.fetch(QUERY);
  } catch (error) {
    console.warn('[blog-previews] WARN Sanity fetch failed — writing empty array:', error?.message ?? error);
  }

  const output = posts.map((p) => ({ title: p.title, slug: p.slug }));
  const outputPath = resolve(__dirname, '../src/data/generatedBlogPreviews.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`[blog-previews] Wrote ${output.length} post preview(s) to ${outputPath}`);
}

main().catch((err) => {
  // Non-fatal: write nothing and let the build continue. An empty/missing file
  // means the CollectionPage has no hasPart (same as before this script), not a
  // broken build.
  console.warn('[blog-previews] WARN generator failed (non-fatal):', err?.message ?? err);
});
