import { View, Text, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { ConversationList } from './ConversationList';
import { OrbIcon } from '../OrbIcon';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

/** Persistent web sidebar: logo, dashboard link, conversation list, and Profile/Settings/theme/sign-out pinned at the bottom. */
export function AppSidebar() {
  const signOut = useAuthStore((s) => s.signOut);
  const { colorScheme } = useColorScheme();
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const pathname = usePathname();
  const onDashboard = pathname.includes('/dashboard');
  const onMemoryMap = pathname.includes('/memory-map');

  return (
    <View className="h-full w-full border-r border-border-light bg-bg-light p-3 dark:border-border dark:bg-black/20">
      <Pressable
        onPress={() => router.push('/')}
        accessibilityRole="link"
        accessibilityLabel="NexusChat home"
        className="mb-3 flex-row items-center gap-2 px-1"
      >
        <OrbIcon size={26} />
        <View>
          <Text className="text-sm font-semibold text-ink-primary-light dark:text-ink-primary">NexusChat</Text>
          <Text className="text-[10px] text-ink-muted-light dark:text-ink-muted">Your AI, everywhere</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(app)/dashboard')}
        accessibilityRole="link"
        accessibilityLabel="Dashboard"
        accessibilityState={{ selected: onDashboard }}
        className={`mb-2 flex-row items-center gap-2 rounded-lg px-3 py-2 ${onDashboard ? 'bg-brand/20' : ''}`}
      >
        <Text className={onDashboard ? 'font-semibold text-brand' : 'text-ink-secondary-light dark:text-ink-secondary'}>
          🏠 Dashboard
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(app)/memory-map')}
        accessibilityRole="link"
        accessibilityLabel="Memory Map"
        accessibilityState={{ selected: onMemoryMap }}
        className={`mb-2 flex-row items-center gap-2 rounded-lg px-3 py-2 ${onMemoryMap ? 'bg-brand/20' : ''}`}
      >
        <Text className={onMemoryMap ? 'font-semibold text-brand' : 'text-ink-secondary-light dark:text-ink-secondary'}>
          🌌 Memory Map
        </Text>
      </Pressable>

      <ConversationList />

      <View className="mt-3 gap-2 border-t border-border-light pt-3 dark:border-border">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            accessibilityRole="link"
            accessibilityLabel="Profile"
          >
            <Text className="text-ink-secondary-light dark:text-ink-secondary">👤 Profile</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            accessibilityRole="link"
            accessibilityLabel="Settings"
          >
            <Text className="text-ink-secondary-light dark:text-ink-secondary">⚙️ Settings</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setThemePreference(colorScheme === 'dark' ? 'light' : 'dark')}
            accessibilityRole="button"
            accessibilityLabel={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Text className="text-ink-secondary-light dark:text-ink-secondary">
              {colorScheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </Pressable>
          <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out">
            <Text className="text-ink-secondary-light dark:text-ink-secondary">Sign out</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
