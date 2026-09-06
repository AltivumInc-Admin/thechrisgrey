import { useEffect, useState } from 'react';

/**
 * True while the document is foregrounded, updated on `visibilitychange`.
 *
 * Every rAF-driven surface needs this: a backgrounded tab keeps running the
 * render loop and burning GPU/battery off-screen unless the loop is explicitly
 * paused. Extracted so the R3F canvases stop hand-rolling the identical state +
 * listener pair (AltiMascot and TopologyScene had it byte-for-byte).
 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden));

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return visible;
}
