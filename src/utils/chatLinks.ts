/**
 * Client-side trust boundary for the navigation targets Alti streams back.
 *
 * Every string these guards inspect is model-derived: it arrives over the chat
 * stream and `createChatStreamParser` only JSON.parses it (chatEvents.ts asserts
 * the ChatEvent type, it does not check it). The Lambda allowlists paths and
 * builds podcast URLs from a fixed prefix, but that is a SERVER control — a
 * regression there, or a future tool that forwards a model-authored URL, would
 * otherwise land straight in `navigate()` / `window.open()`.
 *
 * Callers render the card's text and drop the actionable control when a target
 * fails, so a bad target degrades to inert text instead of an open redirect.
 */

/** Mirrors the Lambda's blog slug shape (BLOG_SLUG_PATTERN, validation.mjs). */
const BLOG_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Hosts the podcast citation tool is allowed to deep-link into. */
const TRUSTED_VIDEO_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

/**
 * Fixed origin used only to test whether a candidate path stays same-origin.
 * Never navigated to; the hostname is arbitrary and deliberately not this site's.
 */
const PROBE_ORIGIN = 'https://internal-path-probe.invalid';

/**
 * A same-origin, router-navigable path.
 *
 * Resolution decides this, not a prefix blocklist. A `!path.startsWith('//')`
 * check looks sufficient and is not: the WHATWG URL parser treats a backslash
 * as a slash in special schemes, so `/\evil.example` passes that check and
 * still resolves to `https://evil.example/`, which React Router hands to the
 * browser as a cross-origin navigation. Resolving against a fixed origin and
 * requiring the result to stay on it rejects that and every other escape
 * (`/\/`, tab and newline separators, percent-encoded variants) without this
 * guard having to enumerate them.
 */
export function isInternalPath(path: unknown): path is string {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  try {
    return new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/** A blog slug safe to interpolate into `/blog/<slug>` without escaping the route. */
export function isSafeBlogSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && BLOG_SLUG_PATTERN.test(slug);
}

/** An https YouTube URL — the only absolute destination the chat surface opens. */
export function isTrustedVideoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && TRUSTED_VIDEO_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}
