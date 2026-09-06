import { useEffect, useRef } from 'react';

/**
 * Decorative reading-progress rule for long-form articles.
 *
 * Deliberately aria-hidden rather than role="progressbar": the value changed on
 * essentially every scroll frame, and screen readers that report progressbar
 * updates (NVDA beeps, JAWS speaks the percentage) would fire for the whole
 * length of an article to convey something assistive tech already reports.
 *
 * The bar is full width and scaled with a transform instead of resized: width
 * is a layout property, so `willChange: 'width'` could never composite it and
 * every frame cost layout + paint. scaleX stays on the compositor, and the
 * handler writes it straight to the node, so scrolling never re-renders React.
 */
const ReadingProgressBar = () => {
  const barRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef(0);

  useEffect(() => {
    // scrollHeight is a layout read; taking it inside the scroll frame forced a
    // reflow against the previous frame's style write. Measure only when the
    // page geometry actually changes.
    const measure = () => {
      scrollableRef.current = document.documentElement.scrollHeight - window.innerHeight;
    };

    const paint = () => {
      const scrollable = scrollableRef.current;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      const bar = barRef.current;
      if (bar) {
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
      }
    };

    const remeasure = () => {
      measure();
      paint();
    };

    remeasure();

    // Throttle scroll events with requestAnimationFrame
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          paint();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', remeasure, { passive: true });

    // An article grows after mount — images decode, code blocks get highlighted
    // — and none of that fires `resize`. Without this the cached height goes
    // stale and the bar never reaches the end of the post. Guarded because
    // jsdom has no ResizeObserver.
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            remeasure();
          })
        : null;
    observer?.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', remeasure);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed top-20 left-0 w-full h-[3px] bg-altivum-gold origin-left z-40 transition-none"
      style={{
        transform: 'scaleX(0)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  );
};

export default ReadingProgressBar;
