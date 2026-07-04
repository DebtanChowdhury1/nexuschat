import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { color } from '../constants/theme';

function PulsingDot({ dotColor }: { dotColor: string }) {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 550, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 550, easing: Easing.in(Easing.ease) })
      ),
      -1
    );
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: 0.5 + scale.value * 0.5 }));

  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }, style]} />;
}

export interface TypingLabel {
  label: string;
  /** Participant color in a Live Room; omitted for plain Mirror Mode device labels. */
  color?: string;
}

/**
 * Mirror Mode's live typing indicator — a device beam (pulsing dot) + label
 * rather than a plain text row. Inside a Live Room, `devices` carries each
 * participant's display name + color instead of a device label, so the same
 * component doubles as the room's "who's typing" indicator.
 */
export function TypingIndicator({ devices }: { devices: TypingLabel[] }) {
  if (devices.length === 0) return null;
  const names = devices.map((d) => d.label);
  const text =
    names.length === 1
      ? `Typing on ${names[0]}…`
      : `Typing on ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}…`;
  const dotColor = devices[0].color ?? color.brand.DEFAULT;

  return (
    <View className="flex-row items-center gap-2 border-t border-border-light bg-black/[0.02] px-4 py-1.5 dark:border-border dark:bg-black/10">
      <PulsingDot dotColor={dotColor} />
      <Text className="text-xs italic text-ink-muted-light dark:text-ink-muted">{text}</Text>
    </View>
  );
}
