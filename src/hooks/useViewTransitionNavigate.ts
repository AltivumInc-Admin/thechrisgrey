import { useCallback } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router-dom';
import { REDUCED_MOTION_QUERY } from '../utils/motion';

function supportsViewTransitions(): boolean {
  return 'startViewTransition' in document;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  const transitionNavigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (!supportsViewTransitions() || prefersReducedMotion()) {
        navigate(to, options);
        return;
      }

      document.startViewTransition(() => {
        navigate(to, options);
      });
    },
    [navigate],
  );

  return transitionNavigate;
}
