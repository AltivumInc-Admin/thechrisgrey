import { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED_MOTION_QUERY } from '../utils/motion';

gsap.registerPlugin(ScrollTrigger);

type LenisContextValue = {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, options?: { immediate?: boolean; offset?: number }) => void;
};

export const LenisContext = createContext<LenisContextValue>({
  lenis: null,
  scrollTo: () => {},
});

export function useLenisContext() {
  return useContext(LenisContext);
}

export function useLenisInstance() {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    if (prefersReducedMotion) return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const instance = new Lenis({
      lerp: isTouchDevice ? 0.07 : 0.1,
      duration: 1.2,
      orientation: 'vertical',
      touchMultiplier: isTouchDevice ? 1.5 : 2,
      smoothWheel: true,
    });

    // Bridge Lenis to GSAP ScrollTrigger: scrub-linked reveals read Lenis's
    // animated scroll position (not native scroll), and both run off GSAP's single
    // ticker clock — eliminating the scrub lag/jitter on the homepage's sticky scroll.
    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    // Lenis must be constructed in a browser-only context (window-dependent +
    // matchMedia check above), so this useEffect IS the construction site.
    // Exposing the instance via context provider requires it in state, not a
    // ref. The setState here is the API, not an anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);

    return () => {
      gsap.ticker.remove(tick);
      instance.off('scroll', ScrollTrigger.update);
      instance.destroy();
      // Cleanup runs after unmount; rule doesn't flag setState here.
      setLenis(null);
    };
  }, []);

  const scrollTo = (target: string | number | HTMLElement, options?: { immediate?: boolean; offset?: number }) => {
    if (lenis) {
      lenis.scrollTo(target, options);
    } else {
      if (typeof target === 'number') {
        window.scrollTo({ top: target, left: 0, behavior: 'instant' });
      }
    }
  };

  return { lenis, scrollTo };
}
