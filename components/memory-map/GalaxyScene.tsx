import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { colorForRecency } from '../../lib/memoryMap';
import type { MemoryCluster, MemoryNode } from '../../lib/memoryMap';

function Node({ node, selected, onSelect }: { node: MemoryNode; selected: boolean; onSelect: (n: MemoryNode) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseScale = 0.16 + node.weight * 0.05;
  const color = useMemo(() => colorForRecency(node.recency), [node.recency]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = selected ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15 : 1;
    meshRef.current.scale.setScalar(baseScale * pulse);
  });

  return (
    <mesh
      ref={meshRef}
      position={node.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
    >
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={selected ? 1 : 0.85} />
    </mesh>
  );
}

// Plain HTML overlay rather than drei's <Text> (troika-three-text): the
// latter's async font-atlas generation, when it mounts mid-scroll on the
// landing page's embedded showcase, was reproducibly resetting window
// scroll to 0 — see PipelineScene.tsx's comment for the same issue and fix.
function ClusterLabel({ cluster }: { cluster: MemoryCluster }) {
  return (
    <Html
      position={[cluster.position[0], cluster.position[1] + 1.4, cluster.position[2]]}
      center
      zIndexRange={[10, 0]}
      style={{
        color: '#F5F5F7',
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        padding: '3px 9px',
        borderRadius: 8,
        backgroundColor: 'rgba(8,8,11,0.72)',
        border: '1px solid rgba(255,90,54,0.45)',
      }}
    >
      {cluster.label}
    </Html>
  );
}

function CameraRig({ focusPosition, enableZoom }: { focusPosition: [number, number, number] | null; enableZoom: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (focusPosition) {
      targetVec.current.lerp(new THREE.Vector3(...focusPosition), 0.06);
      const desiredCamPos = new THREE.Vector3(...focusPosition).multiplyScalar(1.6);
      camera.position.lerp(desiredCamPos, 0.04);
    } else {
      targetVec.current.lerp(new THREE.Vector3(0, 0, 0), 0.03);
    }
    if (controlsRef.current) {
      controlsRef.current.target.copy(targetVec.current);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={enableZoom}
      minDistance={4}
      maxDistance={30}
      autoRotate={!focusPosition}
      autoRotateSpeed={0.4}
    />
  );
}

interface GalaxySceneProps {
  nodes: MemoryNode[];
  clusters: MemoryCluster[];
  selectedId: string | null;
  focusPosition: [number, number, number] | null;
  onSelectNode: (node: MemoryNode) => void;
  /**
   * Scroll-to-zoom on OrbitControls calls preventDefault() on every wheel
   * event over the canvas — fine on the dedicated full-screen Memory Map
   * page, but it silently breaks page scroll wherever this scene is
   * embedded inline in a normal scrolling page (the landing page showcase).
   * Defaults to true for the real page; the landing page passes false.
   */
  enableZoom?: boolean;
  /** Pauses the render loop (frameloop="never") once scrolled off-screen — see lib/useInView.ts. Defaults true for the dedicated full-screen page. */
  active?: boolean;
}

/** The Memory Map's 3D galaxy — each conversation a glowing node, clustered by topic, with idle auto-orbit and click-to-focus. */
export function GalaxyScene({ nodes, clusters, selectedId, focusPosition, onSelectNode, enableZoom = true, active = true }: GalaxySceneProps) {
  return (
    <Canvas camera={{ position: [0, 2, 16], fov: 55 }} gl={{ antialias: true, alpha: true }} frameloop={active ? 'always' : 'never'}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#FF8F6B" />
      {clusters.map((cluster) => (
        <ClusterLabel key={cluster.id} cluster={cluster} />
      ))}
      {nodes.map((node) => (
        <Node key={node.conversation.id} node={node} selected={node.conversation.id === selectedId} onSelect={onSelectNode} />
      ))}
      <CameraRig focusPosition={focusPosition} enableZoom={enableZoom} />
    </Canvas>
  );
}
