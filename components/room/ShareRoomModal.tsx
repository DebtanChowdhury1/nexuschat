import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { color } from '../../constants/theme';

interface ShareRoomModalProps {
  visible: boolean;
  url: string | null;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
}

/** Host-only modal shown after tapping "Share Room" — same animated pop-in pattern as ConfirmDialog. */
export function ShareRoomModal({ visible, url, loading, error, onClose }: ShareRoomModalProps) {
  const [copied, setCopied] = useState(false);
  const progress = useSharedValue(0);

  // Was previously assigned directly in the render body (no useEffect),
  // which re-triggered a brand new spring/timing animation on every single
  // re-render of this component — not just when `visible` actually
  // changed. That produced a continuous flood of Reanimated's "writing to
  // value during render" warnings and constant animation churn any time
  // this modal was mounted (e.g. the whole time a Live Room's chat screen
  // was open), regardless of whether the modal was even visible.
  useEffect(() => {
    progress.value = visible ? withSpring(1, { damping: 16, stiffness: 220 }) : withTiming(0, { duration: 120 });
  }, [visible, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.85 + progress.value * 0.15 }],
  }));

  const handleCopy = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!url) return;
    if (Platform.OS === 'web') return handleCopy();
    try {
      await Share.share({ message: url, url });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <Animated.View
          style={cardStyle}
          className="w-full max-w-sm rounded-xl border border-border-light bg-white p-5 dark:border-border dark:bg-[#14141f]"
        >
          <Text className="mb-1.5 text-base font-semibold text-ink-primary-light dark:text-ink-primary">
            Share this room
          </Text>
          <Text className="mb-4 text-sm text-ink-secondary-light dark:text-ink-secondary">
            Anyone with this link can join and chat alongside you — no account needed. It expires in 24 hours.
          </Text>

          {error ? (
            <View className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5">
              <Text className="text-xs text-red-500">{error}</Text>
            </View>
          ) : loading || !url ? (
            <View className="mb-4 items-center rounded-lg border border-border-light py-3 dark:border-border">
              <Text className="text-sm text-ink-muted-light dark:text-ink-muted">Creating room…</Text>
            </View>
          ) : (
            <View className="mb-4 rounded-lg border border-border-light bg-black/[0.03] px-3 py-2.5 dark:border-border dark:bg-white/5">
              <Text numberOfLines={1} className="text-xs text-ink-secondary-light dark:text-ink-secondary">
                {url}
              </Text>
            </View>
          )}

          <View className="flex-row justify-end gap-3">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="rounded-lg px-4 py-2"
            >
              <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">Close</Text>
            </Pressable>
            <Pressable
              onPress={Platform.OS === 'web' ? handleCopy : handleShare}
              disabled={!url}
              accessibilityRole="button"
              accessibilityLabel={Platform.OS === 'web' ? 'Copy link' : 'Share link'}
              className="items-center rounded-lg px-4 py-2 disabled:opacity-40"
              style={{ backgroundColor: color.brand.DEFAULT }}
            >
              <Text className="text-sm font-semibold text-white">
                {Platform.OS === 'web' ? (copied ? 'Copied!' : 'Copy link') : 'Share'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
