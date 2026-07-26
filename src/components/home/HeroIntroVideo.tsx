import { useCallback, useEffect, useRef } from 'react';
import { isMotionDisabled } from '../../utils/motion';

// The animated brand intro is served from the altivum-media-assets CloudFront
// distribution, which is allowlisted under CSP `media-src` in customHttp.yml.
// The poster lives in `public/` (same-origin) on purpose: CSP `img-src` does NOT
// include the CDN, so a CDN-hosted `<img>` — or a `<video poster>`, which the
// browser fetches under `img-src` — would be blocked. A `public/` asset has a
// stable URL, which lets `index.html` emit a `<link rel="preload" as="image">`
// for it so the prerendered LCP image is discovered before the JS bundle parses.
// Video frame 0 is a solid dark-navy field, so the clip starts seamlessly over
// the section background.
const HERO_INTRO_SRC = 'https://d1x8296f4gso9u.cloudfront.net/thechrisgrey/hero-h264.mp4';
const HERO_INTRO_POSTER = '/hero-intro-poster.webp';

// 16:9 clip, contained so the "@TheChrisGrey" wordmark is never cropped. The
// letterbox area falls back to the section's solid altivum-dark, which matches
// the clip's own dark corners, so the framing reads as seamless at any viewport.
const MEDIA_CLASS = 'absolute inset-0 h-full w-full object-contain';

// First-interaction events that grant the user activation browsers require
// before a media element may play audio. Scrolling on this Lenis-driven site is
// wheel/touch, so those cover "scroll anywhere" alongside clicks and keys.
const UNMUTE_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

/**
 * Full-bleed animated brand intro for the home hero. It plays once and rests on
 * the fully assembled wordmark.
 *
 * Sound: browsers block gesture-free autoplay WITH audio, so the clip autoplays
 * muted and unmutes on the visitor's first interaction (click / key / touch /
 * wheel-scroll) — the earliest moment audio is permitted. That listener is
 * one-shot and self-removing.
 *
 * When motion is disabled (prefers-reduced-motion or the prerender crawl) it
 * renders the assembled frame as a static image instead — the same end state,
 * without animation, and a stable DOM for crawlers.
 *
 * Playback is driven purely by the muted + inline autoplay attributes (no
 * imperative play(), which under React StrictMode's double-invoked effects
 * rejected with a transient AbortError and intermittently swapped in the
 * poster). The media is decorative — identity is carried by the sibling sr-only
 * <h1> — so it is aria-hidden.
 */
export default function HeroIntroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mute at attach time — React applies `muted` as a property after creating the
  // node, and gesture-free autoplay is gated on the muted state, so setting it
  // the instant the element mounts removes any doubt. Also keeps a handle for
  // the unmute effect below.
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) el.muted = true;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return; // reduced-motion / prerender renders the poster, no video

    const unmute = () => {
      video.muted = false;
      UNMUTE_EVENTS.forEach((type) => window.removeEventListener(type, unmute));
    };
    UNMUTE_EVENTS.forEach((type) => window.addEventListener(type, unmute, { passive: true }));
    return () => UNMUTE_EVENTS.forEach((type) => window.removeEventListener(type, unmute));
  }, []);

  if (isMotionDisabled()) {
    return (
      <img
        src={HERO_INTRO_POSTER}
        alt=""
        aria-hidden="true"
        className={MEDIA_CLASS}
        width={1920}
        height={1080}
        fetchPriority="high"
        decoding="async"
      />
    );
  }

  return (
    <video
      ref={attachVideo}
      className={MEDIA_CLASS}
      src={HERO_INTRO_SRC}
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      width={1920}
      height={1080}
      fetchPriority="high"
    />
  );
}
