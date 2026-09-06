import { ReactNode, Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface SafeCanvasProps {
  /** The 3D Canvas tree (R3F <Canvas>...) to render. */
  children: ReactNode;
  /**
   * Shown when the canvas tree throws on mount (GLB parse / R3F init /
   * useGLTF Suspense rejection) OR while it suspends. Defaults to null —
   * callers that have a static visual behind the canvas can omit it; callers
   * with no static fallback (e.g. the chat mascot) MUST pass one.
   *
   * NOTE: an error boundary cannot catch errors thrown from the rAF loop
   * (useFrame) or from webglcontextlost DOM events — only render/lifecycle/
   * Suspense errors. Gate the mount with checkWebGLSupport() for the
   * never-had-WebGL case, and listen for webglcontextlost inside the canvas
   * for the lost-after-mount case.
   */
  fallback?: ReactNode;
  /**
   * Names the surface in the RUM/Sentry report, matching every other
   * custom-fallback boundary in the app. Without it a failed canvas is filed
   * under pageName 'unknown'.
   */
  pageName?: string;
}

/**
 * Reusable containment wrapper for WebGL canvases: Suspense (for lazy GLB /
 * useGLTF) + ErrorBoundary (for mount-time throws), both resolving to the same
 * fallback so a failed 3D mount degrades gracefully instead of unmounting the
 * surrounding tree.
 *
 * showHomeButton is deliberately NOT passed: `fallback` is always present in
 * props here (it defaults to null), and ErrorBoundary short-circuits to the
 * fallback whenever that key exists, so the default error page the flag gates
 * is unreachable from this component.
 */
const SafeCanvas = ({ children, fallback = null, pageName }: SafeCanvasProps) => (
  <ErrorBoundary fallback={fallback} pageName={pageName}>
    <Suspense fallback={fallback}>{children}</Suspense>
  </ErrorBoundary>
);

export default SafeCanvas;
