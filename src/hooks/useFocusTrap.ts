import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element and focus the first focusable element
  useEffect(() => {
    if (isActive) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        if (containerRef.current) {
          // Prefer an explicit initial-focus target (e.g. a chat panel's message
          // input) over the first focusable element. Without this, focus lands on
          // the first header button — wrong for a11y, and a focus-steal race: this
          // timer can fire mid-interaction and yank focus off the input the user is
          // typing into. Honoring [data-autofocus] makes the steal target the input
          // itself, so it is correct whether it fires before, during, or after.
          const preferred = containerRef.current.querySelector<HTMLElement>('[data-autofocus]');
          if (preferred) {
            preferred.focus();
            return;
          }
          const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      }, 10);

      return () => clearTimeout(timer);
    } else {
      // Return focus to previously focused element
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
        previouslyFocusedRef.current = null;
      }
    }
  }, [isActive]);

  // Return focus to the previously focused element when the trap unmounts
  // while active. Consumers like ChatWidgetPanel are conditionally rendered
  // ({isOpen && <Panel/>}) and removed from the tree on close, so the
  // [isActive] effect above never re-runs with isActive=false — the else
  // branch that restores focus is skipped. This unmount-only cleanup closes
  // that gap so Escape (and any other close path that unmounts the trap)
  // returns focus to the launcher (VAL-ENG-010). The ref is null when the
  // trap was never active or when the [isActive] else branch already ran,
  // so this is a safe no-op in those cases.
  useEffect(() => {
    return () => {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
        previouslyFocusedRef.current = null;
      }
    };
  }, []);

  // Callback-ref form for consumers that need to wire multiple refs to the
  // same DOM element (e.g. FallbackDetail tracks its own panelRef alongside
  // the focus-trap container). Use this in a JSX `ref={(el) => { ... }}`
  // callback instead of mutating `containerRef.current` directly — the
  // react-hooks/immutability rule treats hook-returned refs as owned by the
  // hook, and writing to `.current` from the consumer trips it.
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: go backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: go forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  return { containerRef, setContainerRef, handleKeyDown };
}
