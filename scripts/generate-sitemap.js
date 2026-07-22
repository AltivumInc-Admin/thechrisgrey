/**
 * Sitemap Generator Script
 * Fetches blog posts from Sanity and generates a dynamic sitemap.xml
 * Run after vite build: node scripts/generate-sitemap.js
 */

import { createClient } from '@sanity/client';
import { writeFileSync, realpathSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Sanity client configuration
const client = createClient({
  projectId: 'k5950b3w',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false, // We want fresh data at build time
  timeout: 15000, // 15s — fail fast if Sanity is unreachable
});

// Static pages with their priorities and change frequencies.
//
// The bare route paths are exported as STATIC_ROUTES (single source of truth):
// scripts/prerender.js imports them so the prerender crawl set can never drift
// from the sitemap. This file owns the per-route SEO metadata (priority,
// changefreq); prerender only needs the paths.
//
// EXCLUDED from staticPages (and therefore from STATIC_ROUTES / the prerender
// crawl / the sitemap):
//   - /chat    — app-shell page, noIndex in routes.ts (VAL-AEO-008, VAL-SEO-010)
//   - /admin   — Cognito-gated, noIndex in routes.ts
//   - /blueprint — feature-flagged, noIndex in routes.ts (excluded when flag off)
//
// `contentFile` maps each route to the page component whose content determines
// the sitemap <lastmod>. At build time we read the git commit date of that file
// (stable across builds — unlike fs.mtime which resets on every checkout), so
// two consecutive builds with no content change produce identical static-route
// lastmod values (VAL-SEO-003).
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly', contentFile: 'src/pages/Home.tsx' },
  { url: '/about', priority: '0.8', changefreq: 'monthly', contentFile: 'src/pages/About.tsx' },
  { url: '/altivum', priority: '0.9', changefreq: 'weekly', contentFile: 'src/pages/Altivum.tsx' },
  { url: '/foundation', priority: '0.9', changefreq: 'weekly', contentFile: 'src/pages/Foundation.tsx' },
  { url: '/podcast', priority: '0.8', changefreq: 'weekly', contentFile: 'src/pages/Podcast.tsx' },
  { url: '/blog', priority: '0.8', changefreq: 'weekly', contentFile: 'src/pages/Blog.tsx' },
  { url: '/contact', priority: '0.7', changefreq: 'monthly', contentFile: 'src/pages/Contact.tsx' },
  { url: '/links', priority: '0.7', changefreq: 'monthly', contentFile: 'src/pages/Links.tsx' },
  {
    url: '/beyond-the-assessment',
    priority: '0.7',
    changefreq: 'monthly',
    contentFile: 'src/pages/BeyondTheAssessment.tsx',
  },
  { url: '/aws', priority: '0.8', changefreq: 'monthly', contentFile: 'src/pages/AWS.tsx' },
  { url: '/claude', priority: '0.8', changefreq: 'monthly', contentFile: 'src/pages/Claude.tsx' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly', contentFile: 'src/pages/Privacy.tsx' },
];

/**
 * Bare static route paths, the single source of truth shared with
 * scripts/prerender.js (which imports this) so the prerender crawl set and the
 * sitemap never diverge. Derived from staticPages so adding a route in one
 * place updates both.
 */
export const STATIC_ROUTES = staticPages.map((page) => page.url);

/**
 * GROQ projection for every published blog slug, shared with
 * scripts/prerender.js. Sitemap also needs _updatedAt for <lastmod>; prerender
 * only reads .slug, so the extra field is harmless there.
 */
export const BLOG_SLUGS_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current,
    "lastmod": _updatedAt
  }`;

const SITE_URL = 'https://thechrisgrey.com';

/**
 * Fetch all published blog posts from Sanity
 */
async function fetchBlogPosts() {
  try {
    const posts = await client.fetch(BLOG_SLUGS_QUERY);
    return posts;
  } catch (error) {
    console.error('Error fetching posts from Sanity:', error);
    process.exit(1);
  }
}

/**
 * Format date to YYYY-MM-DD for sitemap
 */
function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().split('T')[0];
  return new Date(dateString).toISOString().split('T')[0];
}

/**
 * Resolve the last content-change date for a static route's page component
 * using git commit history (VAL-SEO-003). Unlike fs.mtime (which resets on
 * every checkout), `git log` returns the date the file was last committed —
 * stable across builds as long as the content hasn't changed. Falls back to
 * today's date only if git is unavailable or the file is untracked.
 */
function staticRouteLastmod(contentFile) {
  const absPath = join(REPO_ROOT, contentFile);
  try {
    // %cI = committer date in ISO 8601 format
    const iso = execSync(`git log -1 --format=%cI -- "${contentFile}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    if (iso) return formatDate(iso);
  } catch {
    // git not available, file untracked, or timeout — fall back to file mtime
    try {
      if (existsSync(absPath)) {
        const stat = execSync(`stat -f %Sm -t %Y-%m-%d "${absPath}"`, {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        if (stat) return stat;
      }
    } catch {
      // stat also failed — fall through to today
    }
  }
  return formatDate(new Date().toISOString());
}

/**
 * Generate XML for a single URL entry
 */
function generateUrlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Generate the complete sitemap XML
 */
async function generateSitemap() {
  console.log('Generating sitemap...');

  // Generate static page entries. lastmod is derived from the page component's
  // git commit date (VAL-SEO-003), NOT new Date() at build time, so two
  // consecutive builds with no content change produce identical lastmod values.
  const staticEntries = staticPages.map((page) =>
    generateUrlEntry({
      loc: `${SITE_URL}${page.url}`,
      lastmod: page.contentFile ? staticRouteLastmod(page.contentFile) : formatDate(new Date().toISOString()),
      changefreq: page.changefreq,
      priority: page.priority,
    }),
  );

  // Fetch and generate blog post entries
  const posts = await fetchBlogPosts();
  console.log(`Found ${posts.length} blog posts`);

  const blogEntries = posts.map((post) =>
    generateUrlEntry({
      loc: `${SITE_URL}/blog/${post.slug}`,
      lastmod: formatDate(post.lastmod),
      changefreq: 'monthly',
      priority: '0.6',
    }),
  );

  // Combine all entries
  const allEntries = [...staticEntries, ...blogEntries];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.join('\n')}
</urlset>
`;

  // Write to dist folder
  const outputPath = resolve(__dirname, '../dist/sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');

  console.log(`Sitemap generated successfully at ${outputPath}`);
  console.log(`Total URLs: ${allEntries.length} (${staticPages.length} static + ${posts.length} blog posts)`);
}

// Run the generator only when executed directly (`node scripts/generate-sitemap.js`).
// Guarded so scripts/prerender.js can import STATIC_ROUTES / BLOG_SLUGS_QUERY
// without triggering a sitemap write as an import side effect. Compared via
// pathToFileURL(realpathSync(...)) so the match is robust to symlinked /
// realpath-differing invocations rather than the fragile `file://${argv[1]}` idiom.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  generateSitemap().catch((err) => {
    console.error('Sitemap generation failed:', err);
    process.exit(1);
  });
}
