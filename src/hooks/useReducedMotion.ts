import { REDUCED_MOTION_QUERY } from '../utils/motion';
import { useMediaQuery } from './useMediaQuery';

/**
 * True while the visitor has `prefers-reduced-motion: reduce` set, re-rendering
 * if they toggle the OS/browser setting mid-session.
 *
 * The reactive counterpart to `isMotionDisabled()` in src/utils/motion.ts, which
 * is a one-shot read for render-time decisions and additionally returns true
 * during the prerender crawl. Use this one wherever a live rAF loop has to react
 * to the preference changing (the R3F canvases), and `isMotionDisabled()` where
 * the answer is only needed once, at mount.
 *
 * Exists so the query string is not hand-written at each canvas: a typo fails
 * open (`matches` false), animating for exactly the visitor who asked it not to.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
