/**
 * Shared build-time Sanity client + site constants.
 *
 * generate-sitemap.js, generate-rss.js, generate-blog-previews.js,
 * prerender.js and rewrite-blog-headings.mjs each used to declare a
 * byte-identical `createClient({ projectId, dataset, apiVersion, useCdn,
 * timeout })` block and its own SITE_URL copy, so an apiVersion or timeout
 * change had to land in five files to stay coherent (prerender.js even carried
 * a comment saying its copy was "SAME config as generate-sitemap.js /
 * generate-rss.js"). This module is the single source of truth for that config,
 * the same consolidation generate-sitemap.js already demonstrates for
 * STATIC_ROUTES / BLOG_SLUGS_QUERY.
 *
 * useCdn is false for every build-time read on purpose: the Sanity CDN can
 * serve content that predates the publish which triggered the build, which
 * would ship a sitemap/feed/preview set missing the post the editor just
 * published.
 *
 * `perspective` is pinned here for the same reason src/sanity/client.ts pins it:
 * the `production` dataset is aclMode `public`, so an unauthenticated
 * `?perspective=drafts` read is served without a token. These scripts bake
 * titles, slugs and lastmod into prerendered JSON-LD, sitemap.xml and rss.xml,
 * and prerendered output that disagrees with what the runtime client shows is a
 * draft leak that survives in dist/ long after the draft is discarded.
 * Only queries carry the perspective; mutations (rewrite-blog-headings.mjs) are
 * unaffected.
 */
import { createClient } from '@sanity/client';

/**
 * Mirrors SANITY_PROJECTS.main in src/sanity/schemas.ts (the frontend's SSOT
 * for the same backend), except for useCdn/timeout which are build-time
 * choices: fresh reads, and fail fast if Sanity is unreachable.
 */
export const SANITY_BUILD_CONFIG = {
  projectId: 'k5950b3w',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'published',
  timeout: 15000,
};

/** Canonical origin every build-time artifact (sitemap, RSS, OG URLs) writes. */
export const SITE_URL = 'https://thechrisgrey.com';

/**
 * Build a Sanity client for a build script. `overrides` covers the two
 * legitimate per-script differences: a write token, and a longer timeout for
 * scripts that issue many sequential mutations.
 */
export function createBuildClient(overrides = {}) {
  return createClient({ ...SANITY_BUILD_CONFIG, ...overrides });
}
