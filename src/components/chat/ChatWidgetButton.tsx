import { lazy, useCallback, useEffect, useState } from 'react';
import SafeCanvas from '../SafeCanvas';
import { checkWebGLSupport } from '../../utils/checkWebGL';
import { isPrerender } from '../../utils/prerender';
import Icon from '../icons/Icon';

const AltiMascot = lazy(() => import('./AltiMascot'));

interface ChatWidgetButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

// Longest the 3D mount waits when requestIdleCallback is unavailable (Safari)
// or never goes idle. Long enough to clear the LCP window on a slow page, short
// enough that a visitor who reaches for the launcher unprompted still finds the
// mascot already there.
const MASCOT_DEFER_MS = 2500;

const PLATFORM_IDLE: React.CSSProperties = {
  background:
    'radial-gradient(ellipse at center, rgba(197,165,114,0.5) 0%, rgba(197,165,114,0.15) 50%, transparent 100%)',
  boxShadow: '0 0 12px 4px rgba(197,165,114,0.2), 0 0 24px 8px rgba(197,165,114,0.08)',
};

const PLATFORM_ACTIVE: React.CSSProperties = {
  background:
    'radial-gradient(ellipse at center, rgba(197,165,114,0.7) 0%, rgba(197,165,114,0.3) 50%, transparent 100%)',
  boxShadow: '0 0 16px 6px rgba(197,165,114,0.4), 0 0 32px 12px rgba(197,165,114,0.15)',
};

// Static, WebGL-free stand-in for the 3D mascot: shown on unsupported GPUs,
// during the prerender crawl, while the deferred three/drei chunk is still in
// flight, and if the 3D mount throws or loses its context. It carries only the
// glyph — the launcher's chrome (platform, glow, open-state cue) is rendered by
// ChatWidgetButton around BOTH branches, so the button reads identically
// whichever one is on screen.
const MascotFallback = ({ isOpen }: { isOpen: boolean }) => (
  <div data-testid="alti-fallback" className="w-full h-full flex items-center justify-center">
    <Icon name={isOpen ? 'close' : 'support_agent'} className="text-altivum-gold text-3xl" />
  </div>
);

const ChatWidgetButton = ({ isOpen, onClick }: ChatWidgetButtonProps) => {
  // The 3D launcher is the heaviest thing on any page: the R3F/drei chunk, the
  // shared three-vendor chunk and a 1.15MB GLB, all for a 64px button most
  // visitors never click. Hold it until the browser goes idle (or until the
  // visitor actually aims at the launcher, whichever lands first) so none of it
  // competes with the page's LCP asset on all 15 routes the widget renders on.
  // MascotFallback holds the identical box until then, so nothing shifts.
  const [readyFor3D, setReadyFor3D] = useState(false);
  const markReady = useCallback(() => setReadyFor3D(true), []);

  useEffect(() => {
    const idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback : null;
    if (idle) {
      const handle = idle(() => setReadyFor3D(true), { timeout: MASCOT_DEFER_MS });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setReadyFor3D(true), MASCOT_DEFER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // A context lost after mount is unrecoverable from React's side: three.js
  // preventDefaults the event and stops rendering, and neither the error
  // boundary nor the mount-time probe can see it. Latch it for the page and
  // stay on the static stand-in rather than flickering between the two if the
  // browser hands the context back.
  const [contextLost, setContextLost] = useState(false);
  const handleContextLost = useCallback(() => setContextLost(true), []);

  // checkWebGLSupport() gates the mount so unsupported GPUs never attempt a
  // Canvas (which can throw outside React's reach — useFrame rAF errors are NOT
  // catchable by an error boundary). SafeCanvas then contains GLB-parse /
  // R3F-init / useGLTF-Suspense throws at mount time.
  // isPrerender() additionally skips the 3D mount during the build-time crawl
  // so the headless render reaches a stable DOM instead of a never-idle loop.
  const showMascot = readyFor3D && !contextLost && checkWebGLSupport() && !isPrerender();

  // Tooltip text mirrors the aria-label so the visible affordance matches the
  // accessible name (VAL-ENG-010). It is shown on hover AND keyboard focus via
  // group-hover/peer-focus-visible. When the panel is open the tooltip would
  // just repeat the button's own name, so aria-describedby is dropped for that
  // state instead of making a screen reader announce "Close chat" twice.
  const tooltipText = isOpen ? 'Close chat' : 'Chat with Alti';

  return (
    <span className="group fixed bottom-6 right-6 z-40 inline-flex">
      <button
        onClick={onClick}
        onPointerEnter={markReady}
        onFocus={markReady}
        aria-label={isOpen ? 'Close chat' : 'Open chat with Alti'}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? undefined : 'chat-widget-tooltip'}
        className="peer flex flex-col items-center cursor-pointer bg-transparent border-none p-0 transition-transform duration-200 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-altivum-gold focus-visible:ring-offset-2 focus-visible:ring-offset-altivum-dark"
      >
        {/* Fixed 64px slot for whichever branch renders. The launcher is
            bottom-anchored with a content-driven height, so letting the taller
            3D column set the height made the button and its tooltip hop upward
            the moment the lazy chunk landed. */}
        <span className="relative block w-16 h-16">
          <span
            className={`absolute inset-0 transition-opacity duration-200 ${
              isOpen && showMascot ? 'opacity-30' : 'opacity-100'
            }`}
          >
            {showMascot ? (
              <SafeCanvas fallback={<MascotFallback isOpen={isOpen} />} pageName="Alti mascot">
                <AltiMascot onContextLost={handleContextLost} />
              </SafeCanvas>
            ) : (
              <MascotFallback isOpen={isOpen} />
            )}
          </span>
          {/* Open-state cue. aria-expanded carries the state to assistive tech,
              but sighted visitors had only a 10px glyph inside the 16px glow
              platform — below the smallest type in the system — so the launcher
              never visibly became a close control. Dimming the mascot behind a
              legible glyph says it for both branches at once. */}
          {isOpen && showMascot && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Icon name="close" className="text-altivum-silver text-xl" />
            </span>
          )}
        </span>
        {/* Platform — the launcher's hover affordance, two cross-fading glows
            rather than React state driven by the model's raycast. The raycast
            only covered the mesh silhouette, so hovering the button's corners
            lit the tooltip but not the platform, and keyboard focus lit
            neither. */}
        <span className="relative -mt-1.5 flex h-4 w-14 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-[50%]" style={PLATFORM_IDLE} />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[50%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
            style={PLATFORM_ACTIVE}
          />
        </span>
      </button>
      <span
        id="chat-widget-tooltip"
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-altivum-navy px-3 py-1.5 text-sm text-altivum-silver opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-200 group-hover:opacity-100 peer-focus-visible:opacity-100"
      >
        {tooltipText}
      </span>
    </span>
  );
};

export default ChatWidgetButton;
