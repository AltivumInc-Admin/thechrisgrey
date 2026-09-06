import { isPrerender } from './prerender';

/**
 * The reduced-motion media query, in one place.
 *
 * It is read two ways across the app — as a one-shot `matchMedia().matches`
 * check (here, useLenis, useViewTransitionNavigate) and as a reactive
 * subscription (`useReducedMotion`) — and a typo in either spelling fails open:
 * `matches` is simply false and the animation runs for a visitor who asked it
 * not to, with nothing to notice. Every caller resolves the string from here.
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * True when motion-heavy effects (GSAP ScrollTrigger, R3F frameloops, scrub
 * animations) should be skipped and components should render their final
 * post-animation state instead.
 *
 * Two reasons motion gets disabled:
 *
 * 1. `prefers-reduced-motion: reduce` — visitor opted in via OS/browser
 *    accessibility settings.
 * 2. `isPrerender()` — the build-time Puppeteer crawl is rendering the
 *    page. If components render their opacity:0 placeholder markup during
 *    prerender, the resulting static HTML hides its own content from AI
 *    crawlers and search-engine bots that don't execute JS, undoing the
 *    SEO/AI-discoverability work PR #104 did.
 *
 * Order of checks: prerender first (always defined when set), then
 * `typeof window` SSR safety, then the media query (the only call that
 * actually needs a DOM).
 */
export function isMotionDisabled(): boolean {
  if (isPrerender()) return true;
  if (typeof window === 'undefined') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
