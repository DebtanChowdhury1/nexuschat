import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Switch } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';

import { AppHeader } from '../../components/nav/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ThemeSegmentedControl } from '../../components/ThemeSegmentedControl';
import { clearAllConversations, deleteAccountData, exportChatHistory } from '../../lib/dataControls';
import { TONE_OPTIONS } from '../../lib/responseStyle';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted-light dark:text-ink-muted">
      {children}
    </Text>
  );
}

function Card({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 70).springify().damping(18)}
      className="mb-5 gap-3 rounded-xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface"
    >
      {children}
    </Animated.View>
  );
}

export default function SettingsScreen() {
  usePageTitle('Settings');
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const voiceModeEnabled = useSettingsStore((s) => s.voiceModeEnabled);
  const setVoiceModeEnabled = useSettingsStore((s) => s.setVoiceModeEnabled);
  const tone = useSettingsStore((s) => s.tone);
  const setTone = useSettingsStore((s) => s.setTone);

  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const userId = session?.user.id;

  const handleExport = async () => {
    if (!userId) return;
    setExportError(null);
    try {
      await exportChatHistory(userId);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  const handleClearAll = async () => {
    if (!userId) return;
    await clearAllConversations(userId);
    useChatStore.setState({ conversations: [], messagesByConversation: {}, activeLeafByConversation: {} });
    setConfirmClear(false);
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    await deleteAccountData(userId);
    setConfirmDelete(false);
  };

  const handleUpdateEmail = async () => {
    setEmailError(null);
    setEmailStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailStatus('Check your new email to confirm the change.');
      setNewEmail('');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Could not update email.');
    }
  };

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AppHeader
        title="Settings"
        showBack
        right={
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Text className="text-sm text-brand">View profile</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <SectionLabel>Appearance</SectionLabel>
        <Card index={0}>
          <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Theme</Text>
          <ThemeSegmentedControl />
        </Card>

        <SectionLabel>AI preferences</SectionLabel>
        <Card index={1}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Voice mode</Text>
              <Text className="text-xs text-ink-muted-light dark:text-ink-muted">
                Speak instead of type, hear replies aloud
              </Text>
            </View>
            <Switch
              value={voiceModeEnabled}
              onValueChange={setVoiceModeEnabled}
              accessibilityLabel="Voice mode"
              accessibilityRole="switch"
            />
          </View>
          <View className="border-t border-border-light pt-3 dark:border-border">
            <Text className="mb-2 text-sm text-ink-primary-light dark:text-ink-primary">Response tone</Text>
            <View className="flex-row flex-wrap gap-2">
              {TONE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setTone(option.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: tone === option.value }}
                  className={`rounded-full px-3 py-1.5 ${
                    tone === option.value ? 'bg-brand' : 'bg-black/5 dark:bg-white/10'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      tone === option.value ? 'text-white' : 'text-ink-secondary-light dark:text-ink-secondary'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <SectionLabel>Data</SectionLabel>
        <Card index={2}>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Export chat history</Text>
            <Pressable onPress={handleExport} accessibilityRole="button" accessibilityLabel="Export chat history as JSON">
              <Text className="text-sm font-semibold text-brand">Export JSON</Text>
            </Pressable>
          </View>
          {exportError && <Text className="text-xs text-red-400">{exportError}</Text>}
          <View className="flex-row items-center justify-between border-t border-border-light pt-3 dark:border-border">
            <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Clear all conversations</Text>
            <Pressable
              onPress={() => setConfirmClear(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear all conversations"
            >
              <Text className="text-sm font-semibold text-red-500">Clear all</Text>
            </Pressable>
          </View>
        </Card>

        <SectionLabel>Account</SectionLabel>
        <Card index={3}>
          <Text className="text-sm text-ink-primary-light dark:text-ink-primary">Email</Text>
          <Text className="text-xs text-ink-muted-light dark:text-ink-muted">{session?.user.email}</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="New email address"
              placeholderTextColor="#8888a0"
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="New email address"
              className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm text-ink-primary-light dark:border-border dark:text-ink-primary"
            />
            <Pressable
              onPress={handleUpdateEmail}
              disabled={!newEmail.includes('@')}
              accessibilityRole="button"
              accessibilityLabel="Update email"
              className="items-center justify-center rounded-lg bg-brand px-4 disabled:opacity-40"
            >
              <Text className="text-sm font-semibold text-white">Update</Text>
            </Pressable>
          </View>
          {emailStatus && <Text className="text-xs text-brand">{emailStatus}</Text>}
          {emailError && <Text className="text-xs text-red-400">{emailError}</Text>}

          <View className="flex-row items-center justify-between border-t border-red-500/30 pt-3">
            <View className="flex-1 pr-4">
              <Text className="text-sm text-red-500">Delete account</Text>
              <Text className="text-xs text-ink-muted-light dark:text-ink-muted">
                Permanently deletes your conversations and profile, then signs you out
              </Text>
            </View>
            <Pressable
              onPress={() => setConfirmDelete(true)}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              className="rounded-lg border border-red-500 px-3 py-1.5"
            >
              <Text className="text-sm font-semibold text-red-500">Delete</Text>
            </Pressable>
          </View>
        </Card>

        <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out" className="items-center py-3">
          <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">Sign out</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirmClear}
        title="Clear all conversations?"
        description="This permanently deletes every conversation and message. This can't be undone."
        confirmLabel="Clear all"
        danger
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete your account data?"
        description="This permanently deletes all your conversations and your profile, then signs you out. This can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}
