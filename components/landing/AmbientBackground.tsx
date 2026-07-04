import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 260;

function ParticleField({
  scrollProgress,
  mouse,
}: {
  scrollProgress: React.RefObject<number>;
  mouse: React.RefObject<{ x: number; y: number }>;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.02;
    pointsRef.current.rotation.x = (mouse.current?.y ?? 0) * 0.15;
    pointsRef.current.position.y = -(scrollProgress.current ?? 0) * 2.5;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#FF6F4E" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

/**
 * Persistent, fixed-position particle field behind the entire landing page —
 * not scoped to one section. Reacts to scroll (subtle vertical drift) and
 * mouse position (gentle parallax tilt). Deliberately cheap: a single
 * points cloud, no post-processing, so it stays smooth alongside the
 * heavier hero orb. `pointerEvents: none` keeps it from blocking clicks on
 * real content, so mouse/scroll tracking happens via window listeners
 * instead of DOM events on this element.
 */
export function AmbientBackground() {
  const scrollProgress = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight || 1;
      scrollProgress.current = window.scrollY / max;
    };
    const handlePointerMove = (e: PointerEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/*
        react-three-fiber's Canvas hardcodes pointerEvents: 'auto' on its own
        internal wrapper div unless told otherwise (see its `eventSource`
        handling) — it does NOT inherit the 'none' set on the div above.
        Left unset, this fixed, full-viewport decorative canvas silently
        swallows every click anywhere on the page it's mounted on (both here
        and on the dashboard, since fixed positioning ignores the sidebar's
        separate React subtree and covers it too) — reproduced as "nothing
        responsive after login." Must be passed explicitly.
      */}
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ alpha: true }} style={{ pointerEvents: 'none' }}>
        <ParticleField scrollProgress={scrollProgress} mouse={mouse} />
      </Canvas>
    </div>
  );
}
