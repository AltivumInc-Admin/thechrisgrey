import { Suspense, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Icon from '../icons/Icon';

function AltiModel({ onHoverChange, animate }: { onHoverChange: (h: boolean) => void; animate: boolean }) {
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
      onPointerEnter={(e) => {
        e.stopPropagation();
        hoveredRef.current = true;
        onHoverChange(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        hoveredRef.current = false;
        onHoverChange(false);
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

interface AltiMascotProps {
  isOpen: boolean;
}

const AltiMascot = ({ isOpen }: AltiMascotProps) => {
  const [hovered, setHovered] = useState(false);
  const handleHoverChange = useCallback((h: boolean) => setHovered(h), []);

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [docVisible, setDocVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden));
  useEffect(() => {
    const onVisibility = () => setDocVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Keep the 3D mascot, but: honor reduced-motion (render the model once, no idle
  // animation) and pause the render loop entirely when the tab is backgrounded —
  // so it stops burning GPU/battery off-screen. dpr is capped and antialias is off
  // (negligible at 64x64) to keep it light on mobile/high-DPI screens.
  const frameloop: 'always' | 'demand' | 'never' = reducedMotion ? 'demand' : docVisible ? 'always' : 'never';

  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16" style={{ pointerEvents: 'none' }}>
        <Canvas
          frameloop={frameloop}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: false }}
          camera={{ position: [0, 0, 3], fov: 45 }}
          style={{ pointerEvents: 'auto' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 2, 5]} intensity={0.8} />
          <Suspense fallback={null}>
            <AltiModel onHoverChange={handleHoverChange} animate={!reducedMotion} />
          </Suspense>
        </Canvas>
      </div>
      {/* Platform — gold glow, intensifies on hover */}
      <div
        className="w-14 h-4 rounded-[50%] flex items-center justify-center"
        style={{
          marginTop: '-6px',
          background: hovered
            ? 'radial-gradient(ellipse at center, rgba(197,165,114,0.7) 0%, rgba(197,165,114,0.3) 50%, transparent 100%)'
            : 'radial-gradient(ellipse at center, rgba(197,165,114,0.5) 0%, rgba(197,165,114,0.15) 50%, transparent 100%)',
          boxShadow: hovered
            ? '0 0 16px 6px rgba(197,165,114,0.4), 0 0 32px 12px rgba(197,165,114,0.15)'
            : '0 0 12px 4px rgba(197,165,114,0.2), 0 0 24px 8px rgba(197,165,114,0.08)',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {isOpen && <Icon name="close" className="text-altivum-silver text-[10px] leading-none" />}
      </div>
    </div>
  );
};

export default AltiMascot;
