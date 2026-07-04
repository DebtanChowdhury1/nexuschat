import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { color } from '../constants/theme';

function Dot({ delayMs }: { delayMs: number }) {
  const v = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      v.value = withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [v, delayMs]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + v.value * 0.7,
    transform: [{ translateY: -v.value * 4 }],
  }));

  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.brand.DEFAULT }, style]}
    />
  );
}

/** A small bouncing-dots loader shown in place of an assistant reply while it streams in. */
export function ThinkingDots() {
  return (
    <View className="flex-row items-center gap-1.5 py-1">
      <Dot delayMs={0} />
      <Dot delayMs={150} />
      <Dot delayMs={300} />
    </View>
  );
}
