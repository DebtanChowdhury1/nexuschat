import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

/** A pulsing placeholder block — used while conversations/messages are still loading. */
export function Skeleton({ width = '100%', height = 16, radius = 6 }: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: 0.4 + pulse.value * 0.25 }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius }, style]}
      className="bg-black/10 dark:bg-white/10"
    />
  );
}
