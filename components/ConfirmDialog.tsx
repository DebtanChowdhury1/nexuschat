import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  // Driven by a shared value on every `visible` change (rather than reanimated's
  // `entering`/`exiting` mount animations) — those layout animations don't
  // reliably play on react-native-web and left this dialog invisible there.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = visible
      ? withSpring(1, { damping: 16, stiffness: 220 })
      : withTiming(0, { duration: 120 });
  }, [visible, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.85 + progress.value * 0.15 }],
  }));

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <Animated.View
          style={cardStyle}
          className="w-full max-w-sm rounded-xl border border-border-light bg-white p-5 dark:border-border dark:bg-[#14141f]"
        >
          <Text className="mb-2 text-base font-semibold text-ink-primary-light dark:text-ink-primary">{title}</Text>
          <Text className="mb-5 text-sm text-ink-secondary-light dark:text-ink-secondary">{description}</Text>
          <View className="flex-row justify-end gap-3">
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              className="rounded-lg px-4 py-2"
            >
              <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              className={`items-center rounded-lg px-4 py-2 ${danger ? 'bg-red-500/90' : 'bg-brand'}`}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-semibold text-white">{confirmLabel}</Text>}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
