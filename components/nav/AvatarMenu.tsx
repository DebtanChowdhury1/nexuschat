import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Moon, Settings, Sun, User } from 'lucide-react-native';

import { getAvatarPreset } from '../../constants/avatarPresets';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

/** Avatar button + dropdown: Profile, Settings, quick theme toggle, sign out. Used in the header on every (app) screen. */
export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { colorScheme } = useColorScheme();
  const setThemePreference = useThemeStore((s) => s.setPreference);

  const initial = (session?.user.email ?? '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [session?.user.id]);

  const go = (path: '/(app)/profile' | '/(app)/settings') => {
    setOpen(false);
    router.push(path);
  };

  const preset = getAvatarPreset(avatarUrl);
  const iconColor = colorScheme === 'dark' ? '#A1A1AA' : '#52525B';

  const renderAvatar = () => {
    if (preset) {
      return (
        <LinearGradient
          colors={[preset.colors[0], preset.colors[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="text-sm font-semibold text-white">{initial}</Text>
        </LinearGradient>
      );
    }
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />;
    }
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
        <Text className="text-sm font-semibold text-white">{initial}</Text>
      </View>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Account menu"
      >
        {renderAvatar()}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1"
          onPress={() => setOpen(false)}
          // No accessibilityRole here — this backdrop wraps the nested
          // menu-item Pressables below, and react-native-web renders
          // role="button" as a literal <button>; nesting interactive
          // elements inside it is invalid HTML and breaks hydration (see
          // the same fix in ConversationList.tsx).
        >
          <View className="flex-1 items-end px-4 pt-14">
            <View className="w-56 gap-1 rounded-xl border border-border-light bg-white p-2 shadow-lg dark:border-border dark:bg-surface-elevated">
              <Text
                numberOfLines={1}
                className="px-3 py-1.5 text-xs text-ink-muted-light dark:text-ink-muted"
              >
                {session?.user.email}
              </Text>
              <Pressable
                onPress={() => go('/(app)/profile')}
                className="flex-row items-center gap-2.5 rounded-lg px-3 py-2 active:bg-black/5 hover:bg-black/5 dark:active:bg-white/5 dark:hover:bg-white/5"
                accessibilityRole="menuitem"
                accessibilityLabel="Profile"
              >
                <User size={15} color={iconColor} strokeWidth={2} />
                <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Profile</Text>
              </Pressable>
              <Pressable
                onPress={() => go('/(app)/settings')}
                className="flex-row items-center gap-2.5 rounded-lg px-3 py-2 active:bg-black/5 hover:bg-black/5 dark:active:bg-white/5 dark:hover:bg-white/5"
                accessibilityRole="menuitem"
                accessibilityLabel="Settings"
              >
                <Settings size={15} color={iconColor} strokeWidth={2} />
                <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Settings</Text>
              </Pressable>
              <Pressable
                onPress={() => setThemePreference(colorScheme === 'dark' ? 'light' : 'dark')}
                className="flex-row items-center gap-2.5 rounded-lg px-3 py-2 active:bg-black/5 hover:bg-black/5 dark:active:bg-white/5 dark:hover:bg-white/5"
                accessibilityRole="menuitem"
                accessibilityLabel={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {colorScheme === 'dark' ? (
                  <Sun size={15} color={iconColor} strokeWidth={2} />
                ) : (
                  <Moon size={15} color={iconColor} strokeWidth={2} />
                )}
                <Text className="text-sm text-ink-primary-light dark:text-ink-primary">
                  {colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}
                </Text>
              </Pressable>
              <View className="my-1 border-t border-border-light dark:border-border" />
              <Pressable
                onPress={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex-row items-center gap-2.5 rounded-lg px-3 py-2 active:bg-black/5 hover:bg-black/5 dark:active:bg-white/5 dark:hover:bg-white/5"
                accessibilityRole="menuitem"
                accessibilityLabel="Sign out"
              >
                <LogOut size={15} color="#EF4444" strokeWidth={2} />
                <Text className="text-sm text-red-500">Sign out</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
