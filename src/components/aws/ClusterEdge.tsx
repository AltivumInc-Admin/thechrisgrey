import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ClusterEdgeProps {
  start: [number, number, number];
  end: [number, number, number];
}

const PARTICLE_COUNT = 10;

export function ClusterEdge({ start, end }: ClusterEdgeProps) {
  const pointsRef = useRef<THREE.Points>(null);
  // Reactive — re-renders if the visitor toggles the OS reduced-motion setting.
  const reducedMotion = useReducedMotion();

  // Each particle gets a phase offset so they spread along the line
  const phases = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => i / PARTICLE_COUNT), []);

  // Initial positions buffer — used as static positions under reduced motion
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = phases[i];
      arr[i * 3] = start[0] + (end[0] - start[0]) * t;
      arr[i * 3 + 1] = start[1] + (end[1] - start[1]) * t;
      arr[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
    }
    return arr;
  }, [start, end, phases]);

  useFrame(({ clock }) => {
    // No animation under reduced motion — particles stay at evenly-spaced static positions
    if (reducedMotion) return;
    // No `document.hidden` check: TopologyScene drops the canvas to
    // frameloop='never' on visibilitychange, so this callback does not run in a
    // background tab at all and the per-frame read would be dead cost.
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const t = clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Progress along line: phase offset + time, wrapped 0-1
      const progress = (phases[i] + t * 0.15) % 1;
      posAttr.setXYZ(
        i,
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
        start[2] + (end[2] - start[2]) * progress,
      );
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Connection line */}
      <Line points={[start, end]} color="#C5A572" opacity={0.15} transparent lineWidth={1} />

      {/* Traveling particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={PARTICLE_COUNT} />
        </bufferGeometry>
        <PointMaterial size={0.04} color="#C5A572" transparent opacity={0.6} />
      </points>
    </group>
  );
}
