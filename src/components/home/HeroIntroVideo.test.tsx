import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Control the motion gate (prefers-reduced-motion / prerender) per test.
import { isMotionDisabled } from '../../utils/motion';
vi.mock('../../utils/motion', () => ({ isMotionDisabled: vi.fn() }));
const mockedIsMotionDisabled = vi.mocked(isMotionDisabled);

import HeroIntroVideo from './HeroIntroVideo';

const CDN_SRC = 'https://d1x8296f4gso9u.cloudfront.net/thechrisgrey/hero-h264.mp4';
const POSTER_SRC = '/hero-intro-poster.webp';

beforeEach(() => {
  mockedIsMotionDisabled.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
});

describe('HeroIntroVideo', () => {
  it('plays the muted, inline brand-intro video when motion is allowed', () => {
    const { container } = render(<HeroIntroVideo />);

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', CDN_SRC);
    // Gesture-free playback: attribute-driven autoplay + inline + muted.
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('playsinline');
    // muted is applied via the ref (browsers require it for gesture-free autoplay).
    expect((video as HTMLVideoElement).muted).toBe(true);
    // Decorative — identity is carried by the sibling sr-only <h1>.
    expect(video).toHaveAttribute('aria-hidden', 'true');
    // 16:9 intrinsic box reserves layout (no CLS); contained so the wordmark
    // is never cropped.
    expect(video).toHaveAttribute('width', '1920');
    expect(video).toHaveAttribute('height', '1080');
    expect(video?.className).toContain('object-contain');
    // LCP candidate: the hero video is prioritized so it starts ASAP.
    expect(video).toHaveAttribute('fetchpriority', 'high');
    // preload=auto so the browser buffers the clip eagerly.
    expect(video).toHaveAttribute('preload', 'auto');

    // No poster <img> in the animated branch.
    expect(container.querySelector('img')).toBeNull();
  });

  it('unmutes the video on the first user interaction (click / scroll)', () => {
    const { container } = render(<HeroIntroVideo />);
    const video = container.querySelector('video') as HTMLVideoElement;

    // Starts muted so gesture-free autoplay is allowed...
    expect(video.muted).toBe(true);

    // ...and the first interaction anywhere enables audio.
    window.dispatchEvent(new Event('wheel'));
    expect(video.muted).toBe(false);
  });

  it('does not attach interaction listeners when motion is disabled', () => {
    mockedIsMotionDisabled.mockReturnValue(true);
    const { container } = render(<HeroIntroVideo />);
    // Poster branch: no video to unmute, and dispatching an event must not throw.
    expect(container.querySelector('video')).toBeNull();
    expect(() => window.dispatchEvent(new Event('wheel'))).not.toThrow();
  });

  it('renders the static assembled frame (no video) when motion is disabled', () => {
    mockedIsMotionDisabled.mockReturnValue(true);
    const { container } = render(<HeroIntroVideo />);

    expect(container.querySelector('video')).toBeNull();
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', POSTER_SRC);
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img?.className).toContain('object-contain');
    // Explicit dimensions reserve layout (no CLS) — required for the LCP image.
    expect(img).toHaveAttribute('width', '1920');
    expect(img).toHaveAttribute('height', '1080');
    // LCP candidate: the prerendered poster is the home LCP element, so it is
    // prioritized and matches the <link rel="preload"> in index.html.
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });
});
