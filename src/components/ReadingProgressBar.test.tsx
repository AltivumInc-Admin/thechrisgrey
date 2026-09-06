import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ReadingProgressBar from './ReadingProgressBar';

describe('ReadingProgressBar', () => {
  let rafCallback: FrameRequestCallback | null = null;
  let scrollHeightReads = 0;
  let scrollHeight = 2000;

  const setScrollHeight = (value: number) => {
    scrollHeight = value;
  };

  const scrollTo = (y: number) => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      if (rafCallback) rafCallback(0);
    });
  };

  beforeEach(() => {
    rafCallback = null;
    scrollHeightReads = 0;
    scrollHeight = 2000;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    // A getter (not a value) so the tests can count how often the component
    // reads this layout property.
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      get() {
        scrollHeightReads += 1;
        return scrollHeight;
      },
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderBar = () => {
    const { container } = render(<ReadingProgressBar />);
    return container.firstChild as HTMLElement;
  };

  it('should render a decorative bar that is hidden from assistive tech', () => {
    const bar = renderBar();
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    // The value changed on every scroll frame, so exposing it as a live
    // progressbar made screen readers announce continuously while reading.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should start fully collapsed when at the top of the page', () => {
    const bar = renderBar();
    expect(bar.style.transform).toBe('scaleX(0)');
  });

  it('should scale on the compositor rather than animating width', () => {
    const bar = renderBar();
    scrollTo(600);

    // 600 / (2000 - 800) = 50%
    expect(bar.style.transform).toBe('scaleX(0.5)');
    expect(bar.style.willChange).toBe('transform');
    expect(bar.style.width).toBe('');
  });

  it('should not re-measure the document height on every scroll frame', () => {
    renderBar();
    scrollHeightReads = 0;

    scrollTo(200);
    scrollTo(400);
    scrollTo(600);

    expect(scrollHeightReads).toBe(0);
  });

  it('should re-measure the document height on resize', () => {
    const bar = renderBar();
    scrollTo(600);
    expect(bar.style.transform).toBe('scaleX(0.5)');

    setScrollHeight(3200);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // 600 / (3200 - 800) = 25%
    expect(bar.style.transform).toBe('scaleX(0.25)');
  });

  it('should handle zero scrollable height without errors', () => {
    setScrollHeight(800); // equals innerHeight, so nothing is scrollable
    const bar = renderBar();
    expect(bar.style.transform).toBe('scaleX(0)');
  });

  it('should clamp progress to the full width', () => {
    const bar = renderBar();
    scrollTo(2000);
    expect(bar.style.transform).toBe('scaleX(1)');
  });

  it('should clean up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ReadingProgressBar />);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
