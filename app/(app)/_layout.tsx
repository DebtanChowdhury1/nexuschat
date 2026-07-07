import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Redirect, Slot } from 'expo-router';

import { AppSidebar } from '../../components/nav/AppSidebar';
import { BottomTabBar } from '../../components/nav/BottomTabBar';
import { ConversationDrawer } from '../../components/nav/ConversationDrawer';
import { SidebarResizeHandle } from '../../components/nav/SidebarResizeHandle';
import { subscribeToUserConversations, unsubscribe } from '../../lib/realtime';
import { useAndroidKeyboardVisible } from '../../lib/useKeyboardHeight';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useUiStore } from '../../store/uiStore';

/**
 * Shared app shell: a persistent, resizable sidebar on wide (web) screens,
 * or a bottom tab bar + conversation drawer on narrow (mobile) screens.
 * Individual screens under (app)/ only render their own content +
 * AppHeader — the navigation chrome around them lives here so it's
 * identical everywhere.
 */
export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const chatInputFocused = useUiStore((s) => s.chatInputFocused);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const userId = session?.user.id;
  // The tab bar is a fixed-height sibling below the screen content, unaware
  // of the keyboard — left visible, it eats into the space a screen's own
  // keyboard-avoidance reserves for itself, leaving a gap between the input
  // and the keyboard. Hiding it while typing (like most chat apps) removes
  // that gap entirely instead of trying to precisely account for its height.
  const keyboardVisible = useAndroidKeyboardVisible();

  // Keeps the conversation list (sidebar/drawer/dashboard) in sync across
  // devices — e.g. renaming or deleting a chat on web shows up on mobile
  // live, and vice versa — without anyone needing a manual refresh.
  useEffect(() => {
    if (!userId) return;
    // postgres_changes payloads don't carry enough to patch every case
    // (a rename might touch the sort order via updated_at, a DELETE removes
    // a row entirely) cleanly in local state, and these events are rare
    // (a handful of user-driven writes, not a hot streaming path like
    // messages), so a plain refetch is simpler and cheap enough here.
    const channel = subscribeToUserConversations(userId, () => {
      void loadConversations(userId);
    });
    return () => unsubscribe(channel);
  }, [userId, loadConversations]);

  // Funnels through "/" rather than straight to "/login" so the onboarding
  // carousel is always seen first — Expo Go/dev clients sometimes reopen
  // the last-visited screen on launch instead of the bare root URL, which
  // would otherwise land here directly and skip the carousel entirely.
  if (!session) return <Redirect href="/" />;

  if (isWide) {
    return (
      <View className="flex-1 flex-row bg-bg-light dark:bg-bg-dark">
        <View style={{ width: sidebarWidth }}>
          <AppSidebar />
        </View>
        <SidebarResizeHandle />
        <View className="flex-1">
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <View className="flex-1">
        <Slot />
      </View>
      {!keyboardVisible && !chatInputFocused && <BottomTabBar />}
      <ConversationDrawer />
    </View>
  );
}
