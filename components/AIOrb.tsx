import { useEffect } from 'react';
import { View } from 'react-native';
import { Canvas, Circle, Group, RadialGradient, vec, BlurMask } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

import { color } from '../constants/theme';

const ACTIVE_GRADIENT = [color.brand.light, color.brand.DEFAULT, color.accent2.DEFAULT];
const IDLE_GRADIENT = [color.brand.DEFAULT, color.brand.dark, color.accent2.dark];

interface AIOrbProps {
  active: boolean;
  amplitude?: number;
  size?: number;
}

/**
 * Lightweight pulsing gradient blob for native — deliberately avoids
 * Three.js so the Android bundle stays small and animations stay 60fps.
 * Pulses faster while `active` (AI thinking/streaming) is true, and keeps a
 * slow idle breathing animation the rest of the time so it reads as a
 * branded mascot rather than a static icon.
 */
export function AIOrb({ active, amplitude = 0, size = 96 }: AIOrbProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: active ? 700 : 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [active, pulse]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * (active ? 0.18 : 0.08) + amplitude * 0.3 }],
    opacity: 0.85 + pulse.value * 0.15,
  }));

  const radius = useDerivedValue(
    () => size / 2.6 + pulse.value * (active ? size * 0.08 : size * 0.03) + amplitude * size * 0.1
  );

  return (
    <Animated.View style={[{ width: size, height: size }, containerStyle]}>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Circle cx={size / 2} cy={size / 2} r={radius}>
            <RadialGradient
              c={vec(size / 2, size / 2)}
              r={size / 1.8}
              colors={active ? ACTIVE_GRADIENT : IDLE_GRADIENT}
            />
            <BlurMask blur={size * 0.125} style="normal" />
          </Circle>
        </Group>
      </Canvas>
    </Animated.View>
  );
}
