import { useRef, useState } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { color } from '../constants/theme';
import { useThemeStore, type ThemePreference } from '../store/themeStore';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Segmented theme control with a spring-animated sliding pill behind the active option, instead of a hard bg swap. */
export function ThemeSegmentedControl() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const layouts = useRef<Record<ThemePreference, { x: number; width: number }>>({
    light: { x: 0, width: 0 },
    dark: { x: 0, width: 0 },
    system: { x: 0, width: 0 },
  });
  const [ready, setReady] = useState(false);
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  const handleLayout = (value: ThemePreference) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[value] = { x, width };
    if (value === preference) {
      pillX.value = x;
      pillWidth.value = width;
      setReady(true);
    }
  };

  const handlePress = (value: ThemePreference) => {
    setPreference(value);
    const target = layouts.current[value];
    if (target.width > 0) {
      pillX.value = withSpring(target.x, { damping: 18, stiffness: 220 });
      pillWidth.value = withSpring(target.width, { damping: 18, stiffness: 220 });
    }
  };

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
    opacity: ready ? 1 : 0,
  }));

  return (
    <View className="self-start flex-row rounded-lg bg-black/5 p-1 dark:bg-white/5" style={{ position: 'relative' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 6, backgroundColor: color.brand.DEFAULT },
          pillStyle,
        ]}
      />
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <Pressable
            key={option.value}
            onLayout={handleLayout(option.value)}
            onPress={() => handlePress(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={`${option.label} theme`}
            accessibilityState={{ checked: active }}
            className="rounded-md px-3.5 py-1.5"
          >
            <Text
              className={`text-xs ${
                active ? 'font-semibold text-white' : 'text-ink-secondary-light dark:text-ink-secondary'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
