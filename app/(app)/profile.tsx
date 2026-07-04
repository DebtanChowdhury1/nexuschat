import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Image, ActivityIndicator, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Pencil } from 'lucide-react-native';

import { AppHeader } from '../../components/nav/AppHeader';
import { CountUpText } from '../../components/CountUpText';
import { UsageChart } from '../../components/UsageChart';
import { AVATAR_PRESETS, getAvatarPreset, presetAvatarValue } from '../../constants/avatarPresets';
import { color } from '../../constants/theme';
import { pickAndUploadAvatar } from '../../lib/avatar';
import { getUsageStats, getDailyUsage, type DailyUsagePoint } from '../../lib/stats';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useAuthStore } from '../../store/authStore';
import type { Profile } from '../../types/db';

function StatCard({ label, value, index = 0 }: { label: string; value: number | string; index?: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 90).springify().damping(18)}
      className="flex-1 items-center rounded-xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface"
    >
      {typeof value === 'number' ? (
        <CountUpText
          value={value}
          className="text-xl font-semibold text-ink-primary-light dark:text-ink-primary"
        />
      ) : (
        <Text className="text-xl font-semibold text-ink-primary-light dark:text-ink-primary">{value}</Text>
      )}
      <Text className="mt-1 text-xs text-ink-muted-light dark:text-ink-muted">{label}</Text>
    </Animated.View>
  );
}

/** Slow pulsing glow ring behind the avatar — cross-platform Reanimated, no WebGL. */
function AvatarGlow({ size }: { size: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.12 }],
    opacity: 0.35 + pulse.value * 0.25,
  }));

  // A translucent brand-colored disc (CSS radial-gradient isn't a native
  // style prop, so the soft edge comes from opacity + scale animation).
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          top: -10,
          left: -10,
          backgroundColor: `${color.brand.DEFAULT}45`,
        },
        style,
      ]}
    />
  );
}

export default function ProfileScreen() {
  usePageTitle('Profile');
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stats, setStats] = useState<{ conversationCount: number; messageCount: number } | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsagePoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name ?? '');
        }
      });
    getUsageStats(userId).then(setStats).catch(() => setStats({ conversationCount: 0, messageCount: 0 }));
    getDailyUsage(userId, 30).then(setDailyUsage).catch(() => setDailyUsage([]));
  }, [userId]);

  const handlePickAvatar = async () => {
    if (!userId) return;
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (!url) return;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', userId);
      if (updateError) throw updateError;
      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      setPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update avatar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    if (!userId) return;
    setError(null);
    const value = presetAvatarValue(presetId);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: value }).eq('user_id', userId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProfile((prev) => (prev ? { ...prev, avatar_url: value } : prev));
    setPickerOpen(false);
  };

  const handleSaveName = async () => {
    if (!userId) return;
    setEditingName(false);
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === profile?.display_name) return;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('user_id', userId);
    if (!updateError) setProfile((prev) => (prev ? { ...prev, display_name: trimmed } : prev));
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '—';

  const initial = (displayName || session?.user.email || '?').charAt(0).toUpperCase();

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AppHeader
        title="Profile"
        right={
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text className="text-sm text-brand">Settings</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <View className="items-center">
          <Pressable
            onPress={() => setPickerOpen((v) => !v)}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
            className="relative"
          >
            <AvatarGlow size={80} />
            {(() => {
              const preset = getAvatarPreset(profile?.avatar_url);
              if (preset) {
                return (
                  <LinearGradient
                    colors={[preset.colors[0], preset.colors[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text className="text-2xl font-semibold text-white">{initial}</Text>
                  </LinearGradient>
                );
              }
              if (profile?.avatar_url) {
                return <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40 }} />;
              }
              return (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-brand">
                  <Text className="text-2xl font-semibold text-white">{initial}</Text>
                </View>
              );
            })()}
            <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-bg-light bg-surface-light dark:border-bg-dark dark:bg-surface">
              {uploading ? <ActivityIndicator size="small" /> : <Pencil size={11} color="#71717A" strokeWidth={2.2} />}
            </View>
          </Pressable>

          {pickerOpen && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              className="mt-4 w-full items-center gap-3 rounded-xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface"
            >
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted-light dark:text-ink-muted">
                Choose an avatar
              </Text>
              <View className="flex-row flex-wrap justify-center gap-3">
                {AVATAR_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    onPress={() => handleSelectPreset(preset.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${preset.id} avatar`}
                  >
                    <LinearGradient
                      colors={[preset.colors[0], preset.colors[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handlePickAvatar}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Upload a photo instead"
                className="flex-row items-center gap-2 py-1"
              >
                {uploading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <>
                    <Camera size={14} color={color.brand.DEFAULT} strokeWidth={2.2} />
                    <Text className="text-sm font-semibold text-brand">Upload a photo instead</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          )}

          {editingName ? (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
                onSubmitEditing={handleSaveName}
                onBlur={handleSaveName}
                accessibilityLabel="Display name"
                className="mt-4 rounded-lg border border-border-light px-3 py-1.5 text-center text-base text-ink-primary-light dark:border-border dark:text-ink-primary"
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
              <Pressable
                onPress={() => setEditingName(true)}
                accessibilityRole="button"
                accessibilityLabel={`Edit name, currently ${profile?.display_name || 'not set'}`}
                className="mt-4 flex-row items-center gap-2"
              >
                <Text className="text-base font-semibold text-ink-primary-light dark:text-ink-primary">
                  {profile?.display_name || 'Add a name'}
                </Text>
                <Pencil size={13} color="#71717A" strokeWidth={2} />
              </Pressable>
            </Animated.View>
          )}
          <Text className="mt-1 text-xs text-ink-muted-light dark:text-ink-muted">{session?.user.email}</Text>
          {error && <Text className="mt-2 text-xs text-red-400">{error}</Text>}
        </View>

        <View className="mt-8 flex-row gap-3">
          <StatCard label="Conversations" value={stats ? stats.conversationCount : 0} index={0} />
          <StatCard label="Messages" value={stats ? stats.messageCount : 0} index={1} />
          <StatCard label="Member since" value={memberSince} index={2} />
        </View>

        {dailyUsage.length > 0 && (
          <View className="mt-4">
            <UsageChart data={dailyUsage} />
          </View>
        )}

        <Pressable
          onPress={() => router.push('/(app)/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          className="mt-6 flex-row items-center justify-between rounded-xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface"
        >
          <Text className="text-sm text-ink-primary-light dark:text-ink-primary">
            Manage account, theme, and data
          </Text>
          <Text className="text-sm text-brand">Open settings →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
