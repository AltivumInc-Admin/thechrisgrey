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
 * Runs before `vite build` so the JSON is bundled, and degrades to a NO-OP
 * rather than a wipe: when the fetch fails (or comes back empty) the COMMITTED
 * file is left exactly as it is, so the last known-good previews remain the
 * fallback. An empty array is written only to bootstrap a file that does not
 * exist yet — the same rule generate-podcast-episodes.js follows for
 * `generatedEpisodes.json`. Overwriting the tracked file with `[]` on a
 * transient 15s timeout (what this used to do) ships /blog with a
 * CollectionPage carrying no hasPart at all — the exact regression this script
 * exists to prevent — on a build that still exits 0.
 *
 * Usage: node scripts/generate-blog-previews.js
 */
import { writeFileSync, existsSync, realpathSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createBuildClient } from './lib/sanity-build-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = createBuildClient();

// Only slug + title are needed for the CollectionPage hasPart references.
// The ordering deliberately mirrors BLOG_LISTING_QUERY (src/sanity/queries.ts),
// NOT the sitemap's publishedAt-only order, so the seeded hasPart list matches
// the order the listing page renders.
export const QUERY = `*[_type == "post" && defined(slug.current)] | order(isFeatured desc, publishedAt desc) {
    title,
    "slug": slug.current
  }`;

export const PREVIEWS_PATH = resolve(__dirname, '../src/data/generatedBlogPreviews.json');

/**
 * Returns { status: 'written' | 'kept' | 'bootstrapped', count } so the caller
 * (and the test) can assert which path ran. `fetchPosts` / `outputPath` are
 * injectable so the failure path can be exercised without a network call.
 */
export async function generateBlogPreviews({
  fetchPosts = () => client.fetch(QUERY),
  outputPath = PREVIEWS_PATH,
} = {}) {
  let posts = null;
  try {
    posts = await fetchPosts();
  } catch (error) {
    console.warn('[blog-previews] WARN Sanity fetch failed:', error?.message ?? error);
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    if (existsSync(outputPath)) {
      console.warn(`[blog-previews] WARN no posts fetched — keeping the existing previews at ${outputPath}`);
      return { status: 'kept', count: 0 };
    }
    // No last-known-good to keep: write the empty array so the import in
    // Blog.tsx resolves and the build can continue.
    writeFileSync(outputPath, JSON.stringify([], null, 2) + '\n', 'utf-8');
    console.warn(`[blog-previews] WARN no posts fetched and no existing file — bootstrapped empty ${outputPath}`);
    return { status: 'bootstrapped', count: 0 };
  }

  const output = posts.map((p) => ({ title: p.title, slug: p.slug }));
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`[blog-previews] Wrote ${output.length} post preview(s) to ${outputPath}`);
  return { status: 'written', count: output.length };
}

// Only run when invoked directly, so the test suite can import
// generateBlogPreviews without a Sanity fetch and a src/data write happening as
// an import side effect.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  generateBlogPreviews().catch((err) => {
    // Only a writeFileSync failure reaches here — the fetch is handled above.
    // Non-fatal so the "&&"-chained build continues; nothing was written on
    // this path, so the committed previews survive.
    console.warn('[blog-previews] WARN write failed (non-fatal):', err?.message ?? err);
  });
}
