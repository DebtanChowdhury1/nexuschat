import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

import { color } from '../../constants/theme';

const WAYPOINTS: [number, number, number][] = [
  [-3, 0.9, 0],
  [-1, -0.7, 0.6],
  [1, 0.7, -0.6],
  [3, -0.9, 0],
];

function Packet({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p))), []);

  useFrame((state) => {
    const t = Math.min(0.999, Math.max(0.001, progress));
    const pos = curve.getPointAt(t);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.08;
    if (meshRef.current) {
      meshRef.current.position.copy(pos);
      meshRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      glowRef.current.position.copy(pos);
      glowRef.current.scale.setScalar(pulse * 2.2);
    }
  });

  return (
    <>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={color.accent2.DEFAULT} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshBasicMaterial color={color.brand.DEFAULT} toneMapped={false} />
      </mesh>
    </>
  );
}

function PathLine() {
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p)));
    return curve.getPoints(64);
  }, []);
  return <Line points={points} color="#71717A" lineWidth={1.4} transparent opacity={0.35} />;
}

function WaypointNode({ position, active }: { position: [number, number, number]; active: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color={active ? color.accent2.DEFAULT : '#71717A'} toneMapped={false} />
      </mesh>
    </group>
  );
}

function OrbitRig() {
  useFrame((state) => {
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.7;
    state.camera.position.y = Math.cos(state.clock.elapsedTime * 0.12) * 0.3;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

interface PipelineSceneProps {
  /** 0–1 across the whole pipeline (not just the active step) — drives the packet's position along the full curve. */
  progress: number;
  activeStep: number;
  /** Pauses the render loop (frameloop="never") once scrolled off-screen — see lib/useInView.ts. */
  active?: boolean;
}

/** A real 3D scene for the "How it works" section — a glowing packet traveling along a curved path between four waypoints, camera gently drifting. */
export function PipelineScene({ progress, activeStep, active = true }: PipelineSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0, 6.5], fov: 50 }} gl={{ alpha: true, antialias: true }} frameloop={active ? 'always' : 'never'}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={0.9} color="#FF8F6B" />
      <PathLine />
      {WAYPOINTS.map((p, i) => (
        <WaypointNode key={i} position={p} active={i <= activeStep} />
      ))}
      <Packet progress={progress} />
      <OrbitRig />
    </Canvas>
  );
}
