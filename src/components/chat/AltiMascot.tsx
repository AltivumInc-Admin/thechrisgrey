import { Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useDocumentVisible } from '../../hooks/useDocumentVisible';

function AltiModel({ animate }: { animate: boolean }) {
  const { scene } = useGLTF('/alti.glb');
  const groupRef = useRef<THREE.Group>(null);
  const hoveredRef = useRef(false);
  const liftRef = useRef(0);
  const baseY = useRef(0);

  useFrame(({ clock }) => {
    if (!groupRef.current || !animate) return;
    const t = clock.elapsedTime;

    // Gentle idle float — slow sine wave
    const float = Math.sin(t * 1.5) * 0.05;

    // Hover lift lerp — elevates on hover
    const liftTarget = hoveredRef.current ? 0.15 : 0;
    liftRef.current = THREE.MathUtils.lerp(liftRef.current, liftTarget, 0.08);

    groupRef.current.position.y = baseY.current + float + liftRef.current;

    // Subtle side-to-side sway — offset frequency so it doesn't sync with the bob
    groupRef.current.position.x = Math.sin(t * 0.8) * 0.02;

    // Gentle rocking tilt — like breathing or shifting weight
    groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.03;
    groupRef.current.rotation.x = Math.sin(t * 0.9) * 0.02;

    // Slow idle turn — looks around subtly
    const idleTurn = Math.sin(t * 0.4) * 0.08;
    // On hover, turn slightly toward viewer
    const hoverTurn = hoveredRef.current ? 0 : idleTurn;
    groupRef.current.rotation.y = hoverTurn;
  });

  return (
    <group
      ref={groupRef}
      // Raycast hover drives ONLY the 3D lift, which legitimately wants a mesh
      // hit. The launcher's visible hover affordance (the platform glow) is CSS
      // on the button in ChatWidgetButton, so it covers the whole 64px target
      // and keyboard focus instead of just the model's silhouette.
      onPointerEnter={(e) => {
        e.stopPropagation();
        hoveredRef.current = true;
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        hoveredRef.current = false;
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

interface AltiMascotProps {
  /**
   * Called once if the WebGL context is lost after mount (iOS Safari reclaiming
   * it under memory pressure or after long backgrounding, a GPU-process crash,
   * or the browser force-losing the oldest context at the per-page cap). The
   * caller is expected to swap to its static stand-in: three.js `preventDefault`s
   * the event and then early-returns from every render until a restore that may
   * never arrive, which leaves an empty canvas and a rAF loop ticking for
   * nothing — and neither an error boundary nor the mount-time WebGL probe can
   * observe it.
   */
  onContextLost?: () => void;
}

const AltiMascot = ({ onContextLost }: AltiMascotProps) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const docVisible = useDocumentVisible();

  // Keep the 3D mascot, but: honor reduced-motion (render the model once, no idle
  // animation) and pause the render loop entirely when the tab is backgrounded —
  // so it stops burning GPU/battery off-screen. dpr is capped and antialias is off
  // (negligible at 64x64) to keep it light on mobile/high-DPI screens.
  const frameloop: 'always' | 'demand' | 'never' = reducedMotion ? 'demand' : docVisible ? 'always' : 'never';

  // onCreated fires once, so the listener has to reach the CURRENT callback
  // through a ref rather than closing over the one that existed at mount.
  const lostHandlerRef = useRef(onContextLost);
  useEffect(() => {
    lostHandlerRef.current = onContextLost;
  }, [onContextLost]);
  const detachRef = useRef<(() => void) | null>(null);

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvasEl = gl.domElement;
    const onLost = () => lostHandlerRef.current?.();
    canvasEl.addEventListener('webglcontextlost', onLost);
    detachRef.current = () => canvasEl.removeEventListener('webglcontextlost', onLost);
  }, []);

  useEffect(() => () => detachRef.current?.(), []);

  return (
    // pointerEvents is off on the wrapper and back on for the canvas so the
    // surrounding launcher chrome stays click-through while the model can still
    // be raycast for the hover lift.
    <div className="w-full h-full" style={{ pointerEvents: 'none' }}>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: false }}
        camera={{ position: [0, 0, 3], fov: 45 }}
        style={{ pointerEvents: 'auto' }}
        onCreated={handleCreated}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <AltiModel animate={!reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default AltiMascot;
