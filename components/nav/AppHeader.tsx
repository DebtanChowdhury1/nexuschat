import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarMenu } from './AvatarMenu';

interface AppHeaderProps {
  title: string;
  /** Shows a hamburger button (mobile conversation drawer) instead of a back arrow. */
  onMenuPress?: () => void;
  /** Shows a back arrow that pops the current route. */
  showBack?: boolean;
  /** Screen-specific actions rendered before the avatar menu (e.g. the AI orb + branches button on the chat screen). */
  right?: ReactNode;
}

/** Consistent header used across every (app) screen: title/back/menu on the left, screen actions + avatar menu on the right. */
export function AppHeader({ title, onMenuPress, showBack, right }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingTop: insets.top + 12 }}
      className="flex-row items-center justify-between border-b border-border-light bg-bg-light px-4 pb-3 dark:border-border dark:bg-bg-dark"
    >
      <View className="flex-1 flex-row items-center gap-3">
        {onMenuPress && (
          <Pressable onPress={onMenuPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu">
            <Text className="text-lg text-ink-secondary-light dark:text-ink-secondary">☰</Text>
          </Pressable>
        )}
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">‹ Back</Text>
          </Pressable>
        )}
        <Text
          numberOfLines={1}
          className="flex-1 text-base font-semibold text-ink-primary-light dark:text-ink-primary"
        >
          {title}
        </Text>
      </View>

      <View className="flex-row items-center gap-4">
        {right}
        <AvatarMenu />
      </View>
    </View>
  );
}
