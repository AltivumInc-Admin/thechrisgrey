// Policy for CMS-supplied hrefs at the Sanity-to-DOM boundary.
//
// Every href on a rendered post is author-supplied: the Portable Text `link`
// mark, the `bookReference` card link, and the post's `pdfUrl`. Studio validates
// all three, but Studio validation is ADVISORY — a document written straight
// through the HTTP API bypasses it entirely — so the render side has to hold the
// line. This lived privately inside PortableTextComponents.tsx while the third
// href (pdfUrl, on BlogPost.tsx) got no check at all; one module means a new
// authored-link surface cannot quietly opt out.

const SITE_ORIGIN = 'https://thechrisgrey.com';
const SITE_ORIGINS = new Set([SITE_ORIGIN, 'http://thechrisgrey.com']);

/** A single leading slash (NOT `//`, which is protocol-relative), or a bare query/fragment. */
const IN_APP_PATH = /^(\/(?!\/)|[?#])/;

/**
 * Schemes an authored href is allowed to render as a live anchor. Sanity's link
 * annotation validates `href` to exactly these four.
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Whether an authored href may be rendered as a live anchor at all. A rejected
 * href renders as plain text (or, for a download card, not at all) rather than
 * emitting `javascript:`/`data:` into the DOM.
 */
export function isAllowedHref(href: string): boolean {
  if (!href) return false;
  if (IN_APP_PATH.test(href)) return true;
  try {
    return ALLOWED_SCHEMES.has(new URL(href, SITE_ORIGIN).protocol);
  } catch {
    return false;
  }
}

/**
 * Resolve a Portable Text `link` mark `href` to an internal route path when it
 * points at this site, or return `null` when it is anything else.
 *
 *   - In-app paths (`/blog/foo`, `?series=x`, `#section`) are internal — returned as-is.
 *   - Same-origin absolute URLs (`https://thechrisgrey.com/blog/foo?a=1#b`) are
 *     internal — path + search + hash is returned.
 *   - Anything else (`https://example.com/...`, `//evil.com`, `mailto:`, `tel:`,
 *     `javascript:`) is external and returns `null` so the caller keeps the plain
 *     `<a>` rendering.
 *
 * The classification is an allowlist rather than a `!startsWith('http')` test:
 * the old test handed every other scheme back as an "internal path", so a
 * protocol-relative `//evil.com` rendered as a trusted in-app ViewTransitionLink
 * (no `target`, no `rel="noopener"`) and a `mailto:` was rewritten into a route
 * like `/blog/mailto:someone@example.com`.
 *
 * Internal links render as `ViewTransitionLink` so in-blog cross-links perform
 * an SPA transition (preserving chat state and avoiding a full reload); external
 * links keep their existing plain-anchor `target`/`rel` behavior.
 */
export function resolveInternalPath(href: string): string | null {
  if (!href) return null;
  if (IN_APP_PATH.test(href)) return href;
  try {
    const parsed = new URL(href, SITE_ORIGIN);
    if (SITE_ORIGINS.has(parsed.origin)) {
      // search/hash are kept: returning the pathname alone silently dropped the
      // filter or anchor an author put on a same-origin absolute link.
      return `${parsed.pathname || '/'}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Malformed absolute URL — treat as external so we don't silently misroute.
  }
  return null;
}
