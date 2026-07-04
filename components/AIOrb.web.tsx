import { useRef, useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormal;

  // classic simplex-ish noise via sine layering (cheap, good enough for a small orb)
  float noise(vec3 p) {
    return sin(p.x * 3.0 + uTime) * sin(p.y * 3.0 + uTime * 1.3) * sin(p.z * 3.0 + uTime * 0.7);
  }

  void main() {
    vNormal = normal;
    float displacement = noise(position * 1.5) * 0.12 * uIntensity;
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormal;

  void main() {
    vec3 colorA = vec3(1.0, 0.561, 0.420); // brand-light (Ember)
    vec3 colorB = vec3(0.761, 0.227, 0.114); // brand-dark (Ember)
    vec3 colorC = vec3(1.0, 0.176, 0.471); // accent2 (Nova) — the second signature hue
    float mixFactor = 0.5 + 0.5 * sin(uTime * 0.8 + vNormal.y * 3.0);
    vec3 base = mix(colorB, colorA, mixFactor);
    float rimAmount = pow(1.0 - abs(vNormal.z), 2.0) * uIntensity;
    vec3 color = mix(base, colorC, rimAmount * 0.5);
    gl_FragColor = vec4(color + rimAmount * 0.15, 1.0);
  }
`;

function OrbMesh({ active, amplitude = 0 }: { active: boolean; amplitude?: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 1 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * (active ? 2.2 : 0.8) + amplitude * 4;
      materialRef.current.uniforms.uIntensity.value = (active ? 1.6 : 0.6) + amplitude * 1.5;
    }
    if (meshRef.current) {
      const scale = 1 + amplitude * 0.35;
      meshRef.current.scale.setScalar(scale);
      meshRef.current.rotation.y += delta * (active ? 0.6 : 0.15);
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 24]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
      />
    </mesh>
  );
}

interface AIOrbProps {
  active: boolean;
  amplitude?: number;
  size?: number;
}

/**
 * Web-only 3D AI avatar: a shader-morphed icosahedron that pulses faster
 * and brighter while the model is thinking/streaming, with a slow idle
 * rotation the rest of the time. Kept out of the native bundle entirely via
 * the .web.tsx platform extension.
 */
export function AIOrb({ active, amplitude, size = 96 }: AIOrbProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 2.5] }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 2]} intensity={1} />
        <OrbMesh active={active} amplitude={amplitude} />
      </Canvas>
    </View>
  );
}
