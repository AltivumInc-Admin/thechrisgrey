/**
 * Open Graph card routing (frontend side of the build-time OG generator).
 *
 * `scripts/generate-og-images.mjs` renders a branded 1200x630 card per route into
 * `dist/og/<slug>.png`. This module is the FRONTEND counterpart: it tells `SEO.tsx`
 * which routes have a generated card and what URL to point `og:image` / `twitter:image`
 * at. The two must agree on the route set and the slug rule — a drift test
 * (`ogCards.test.ts`) parses the generator and asserts they stay in sync, so a card
 * can't be generated without a reference (orphan) or referenced without being
 * generated (broken image).
 *
 * Routes WITHOUT a card (e.g. dynamic blog posts, which supply their own image)
 * fall back to the shared `/og.png`.
 */

const SITE_URL = 'https://thechrisgrey.com';

/**
 * Routes that have a generated OG card. MUST equal the keys of `OG_CARDS` in
 * `scripts/generate-og-images.mjs` (enforced by the drift test). Currently the
 * full indexable static route set — every shareable page gets its own card.
 */
export const OG_CARD_PATHS: readonly string[] = [
  '/',
  '/about',
  '/altivum',
  '/foundation',
  '/podcast',
  '/beyond-the-assessment',
  '/aws',
  '/claude',
  '/blog',
  '/links',
  '/contact',
  '/privacy',
];

/** Route path -> card slug. Mirrors `slugForPath` in generate-og-images.mjs. */
export function slugForOgPath(path: string): string {
  // 'home-hero', not 'home': the home card is the committed photographic
  // asset, and the changed filename forces X to re-scrape past its stale
  // imageless cache of /og/home.png (see generate-og-images.mjs).
  if (path === '/') return 'home-hero';
  // Same committed-asset + fresh-URL treatment as home (see generate-og-images.mjs).
  if (path === '/podcast') return 'podcast-hero';
  if (path === '/beyond-the-assessment') return 'beyond-the-assessment-hero';
  return path.replace(/^\//, '').replace(/\//g, '-');
}

/**
 * Resolve the og:image URL for a page given its canonical `url`. Returns the
 * per-route card when the route has one, else the shared `/og.png` fallback.
 * Trailing slashes are normalized (Amplify serves routes as `/aws/`).
 */
export function ogImageForUrl(url: string | undefined): string {
  const fallback = `${SITE_URL}/og.png`;
  if (!url) return fallback;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return fallback;
  }
  pathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (OG_CARD_PATHS.includes(pathname)) {
    return `${SITE_URL}/og/${slugForOgPath(pathname)}.png`;
  }
  return fallback;
}
