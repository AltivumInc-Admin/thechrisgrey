import { lazy } from 'react';
import SafeCanvas from '../SafeCanvas';
import { checkWebGLSupport } from '../../utils/checkWebGL';
import { isPrerender } from '../../utils/prerender';
import Icon from '../icons/Icon';

const AltiMascot = lazy(() => import('./AltiMascot'));

interface ChatWidgetButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

// Static, WebGL-free stand-in for the 3D mascot: shown on unsupported GPUs
// and if the 3D mount throws. Keeps the button meaningful and clickable.
const MascotFallback = () => (
  <div
    data-testid="alti-fallback"
    className="w-16 h-16 flex items-center justify-center rounded-full"
    style={{
      background: 'radial-gradient(circle at center, rgba(197,165,114,0.18) 0%, transparent 70%)',
    }}
  >
    <Icon name="support_agent" className="text-altivum-gold text-3xl" />
  </div>
);

const ChatWidgetButton = ({ isOpen, onClick }: ChatWidgetButtonProps) => {
  // checkWebGLSupport() gates the mount so unsupported GPUs never attempt a
  // Canvas (which can throw outside React's reach — useFrame rAF errors and
  // webglcontextlost are NOT catchable by an error boundary). SafeCanvas then
  // contains GLB-parse / R3F-init / useGLTF-Suspense throws at mount time.
  // isPrerender() additionally skips the 3D mount during the build-time crawl
  // so the headless render reaches a stable DOM instead of a never-idle loop.
  const showMascot = checkWebGLSupport() && !isPrerender();

  // Tooltip text mirrors the aria-label so the visible affordance matches the
  // accessible name (VAL-ENG-010). It is shown on hover AND keyboard focus via
  // group-hover/group-focus-visible, and exposed to assistive tech through
  // aria-describedby so SR users get the description alongside the label.
  const tooltipText = isOpen ? 'Close chat' : 'Chat with Alti';

  return (
    <span className="group fixed bottom-6 right-6 z-40 inline-flex">
      <button
        onClick={onClick}
        aria-label={isOpen ? 'Close chat' : 'Open chat with Alti'}
        aria-expanded={isOpen}
        aria-describedby="chat-widget-tooltip"
        className="flex items-center justify-center cursor-pointer bg-transparent border-none p-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-altivum-gold focus-visible:ring-offset-2 focus-visible:ring-offset-altivum-dark"
      >
        {showMascot ? (
          <SafeCanvas fallback={<MascotFallback />}>
            <AltiMascot isOpen={isOpen} />
          </SafeCanvas>
        ) : (
          <MascotFallback />
        )}
      </button>
      <span
        id="chat-widget-tooltip"
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-altivum-navy px-3 py-1.5 text-sm text-altivum-silver opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {tooltipText}
      </span>
    </span>
  );
};

export default ChatWidgetButton;
