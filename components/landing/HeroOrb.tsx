import { useEffect, useRef, useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  float noise(vec3 p) {
    return sin(p.x * 2.5 + uTime) * sin(p.y * 2.5 + uTime * 1.2) * sin(p.z * 2.5 + uTime * 0.8);
  }
  void main() {
    vNormal = normal;
    float displacement = noise(position * 1.4) * 0.16;
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  void main() {
    vec3 ember = vec3(1.0, 0.353, 0.212);
    vec3 nova = vec3(1.0, 0.176, 0.471);
    vec3 emberDark = vec3(0.5, 0.12, 0.08);
    float mixFactor = 0.5 + 0.5 * sin(uTime * 0.6 + vNormal.y * 3.0);
    vec3 base = mix(emberDark, ember, mixFactor);
    float rim = pow(1.0 - abs(vNormal.z), 2.2);
    vec3 color = mix(base, nova, rim * 0.6);
    gl_FragColor = vec4(color + rim * 0.25, 1.0);
  }
`;

function OrbCore({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
      // Gently look toward the cursor rather than snapping to it.
      groupRef.current.rotation.x += ((mouse.current?.y ?? 0) * 0.3 - groupRef.current.rotation.x) * 0.04;
      groupRef.current.rotation.y += (mouse.current?.x ?? 0) * 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1, 32]} />
        <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={VERTEX_SHADER} fragmentShader={FRAGMENT_SHADER} />
      </mesh>
    </group>
  );
}

function OrbitingParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 90;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.6 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.15;
      ref.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#FF8F6B" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

/**
 * The landing page's centerpiece — a larger, more elaborate cousin of the
 * functional chat AIOrb. Reacts to cursor position and has an orbiting
 * particle halo. Kept as its own component (rather than reusing AIOrb)
 * because the hero needs this extra visual weight while the in-chat orb
 * stays cheap and purely functional.
 */
/**
 * `active` pauses the R3F render loop entirely (frameloop="never") once
 * this orb has scrolled off-screen, rather than just delaying its initial
 * mount — see lib/useInView.ts for why a permanently-running loop matters
 * even when off-screen. Defaults to true so the Hero's own always-visible
 * orb doesn't need to opt in.
 */
export function HeroOrb({ size = 360, active = true }: { size?: number; active?: boolean }) {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3.2] }} gl={{ alpha: true, antialias: true }} frameloop={active ? 'always' : 'never'}>
        <ambientLight intensity={0.7} />
        <pointLight position={[2, 2, 2]} intensity={1.2} color="#FF8F6B" />
        <OrbCore mouse={mouse} />
        <OrbitingParticles />
      </Canvas>
    </View>
  );
}
