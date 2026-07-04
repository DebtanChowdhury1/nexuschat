import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import {
  Plus,
  Mic,
  Ghost,
  Users2,
  Orbit,
  MessageSquare,
  MessagesSquare,
  CalendarDays,
  ChevronRight,
} from 'lucide-react-native';

import { AIOrb } from '../../components/AIOrb';
import { AppHeader } from '../../components/nav/AppHeader';
import { color } from '../../constants/theme';
import { getOrCreateActiveRoom, joinRoom } from '../../lib/rooms';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { usePageTitle } from '../../lib/usePageTitle';

function StatCard({
  label,
  value,
  Icon,
  index,
}: {
  label: string;
  value: number;
  Icon: typeof MessageSquare;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).springify().damping(16)}
      className="flex-1 flex-row items-center gap-3 rounded-2xl border border-border-light bg-white p-3.5 dark:border-border dark:bg-surface"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
        <Icon size={18} color={color.brand.DEFAULT} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-bold text-ink-primary-light dark:text-ink-primary">{value}</Text>
        <Text numberOfLines={1} className="text-xs text-ink-secondary-light dark:text-ink-secondary">
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

function ActionPill({
  label,
  Icon,
  onPress,
  primary,
}: {
  label: string;
  Icon: typeof Plus;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={
        primary
          ? 'flex-row items-center gap-2 rounded-xl bg-brand px-4 py-2.5 active:opacity-80'
          : 'flex-row items-center gap-2 rounded-xl border border-border-light px-4 py-2.5 active:bg-black/5 dark:border-border dark:active:bg-white/5'
      }
    >
      <Icon size={15} color={primary ? '#fff' : color.brand.DEFAULT} strokeWidth={2.2} />
      <Text
        className={
          primary
            ? 'text-[13px] font-semibold text-white'
            : 'text-[13px] font-semibold text-ink-primary-light dark:text-ink-primary'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Native dashboard — mirrors the web version's features (greeting + orb, live stats, quick actions, recent conversations) with Skia/Reanimated instead of Three.js/Framer Motion. */
export default function DashboardScreen() {
  usePageTitle('Dashboard');
  const session = useAuthStore((s) => s.session);
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const [messageCount, setMessageCount] = useState(0);
  const [displayName, setDisplayName] = useState(() => session?.user.email?.split('@')[0] ?? 'there');
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (session?.user.id) loadConversations(session.user.id);
  }, [session?.user.id, loadConversations]);

  useEffect(() => {
    if (!session?.user.id) return;
    // Supabase's query builder returns a PromiseLike, not a real Promise —
    // .then() on it doesn't type-check a chained .catch(), so wrap it in a
    // real Promise first.
    Promise.resolve(
      supabase.from('profiles').select('display_name').eq('user_id', session.user.id).single()
    )
      .then(({ data }) => {
        const name = data?.display_name || session.user.email?.split('@')[0];
        if (name) setDisplayName(name);
      })
      .catch(() => {
        // Non-critical — the email-derived fallback name (set in useState
        // above) already covers this, so there's nothing further to show.
      });
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;
    setStatsError(false);
    Promise.resolve(
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('role', 'user')
    )
      .then(({ count, error }) => {
        if (error) throw error;
        setMessageCount(count ?? 0);
      })
      .catch(() => {
        // Previously silent — a network blip or RLS denial would leave the
        // stat frozen at 0 with no indication anything went wrong, reading
        // as "you have no messages" instead of "this failed to load".
        setStatsError(true);
      });
  }, [session?.user.id]);

  const daysActive = useMemo(() => {
    const days = new Set(conversations.map((c) => c.created_at.slice(0, 10)));
    return days.size;
  }, [conversations]);

  const visibleConversations = conversations.filter((c) => !c.is_temporary);

  const handleNewChat = async (isTemporary = false) => {
    if (!session?.user.id) return;
    const conversation = await createConversation(session.user.id, isTemporary);
    router.push(`/(app)/chat/${conversation.id}`);
  };

  const handleVoiceChat = async () => {
    if (!session?.user.id) return;
    const conversation = await createConversation(session.user.id);
    router.push(`/(app)/chat/${conversation.id}?voice=1`);
  };

  const handleStartRoom = async () => {
    if (!session?.user.id) return;
    const conversation = await createConversation(session.user.id);
    const room = await getOrCreateActiveRoom(conversation.id, session.user.id);
    const hostName = session.user.email?.split('@')[0] ?? 'Host';
    await joinRoom(room.id, session.user.id, hostName);
    router.push(`/(app)/chat/${conversation.id}?room=${room.id}`);
  };

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AppHeader title="Dashboard" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Hero: pulsing orb + greeting */}
        <Animated.View entering={FadeInDown.springify().damping(16)} className="items-center py-4">
          <AIOrb active={false} size={110} />
          <Text className="mt-3 text-2xl font-bold text-ink-primary-light dark:text-ink-primary">
            Welcome back, {displayName}
          </Text>
          <Text className="mt-1 text-sm text-ink-secondary-light dark:text-ink-secondary">
            What are we exploring today?
          </Text>
        </Animated.View>

        {/* Live stats */}
        <View className="mt-2 flex-row gap-2.5">
          <StatCard label="Chats" value={visibleConversations.length} Icon={MessagesSquare} index={0} />
          <StatCard label="Messages" value={messageCount} Icon={MessageSquare} index={1} />
          <StatCard label="Days" value={daysActive} Icon={CalendarDays} index={2} />
        </View>
        {statsError && (
          <Text className="mt-2 text-center text-xs text-red-400">
            Couldn't load your message count — pull to refresh or try again shortly.
          </Text>
        )}

        {/* Quick actions */}
        <Animated.View
          entering={FadeInUp.delay(240).springify().damping(16)}
          className="mt-5 flex-row flex-wrap gap-2.5"
        >
          <ActionPill label="New chat" Icon={Plus} onPress={() => handleNewChat(false)} primary />
          <ActionPill label="Voice mode" Icon={Mic} onPress={handleVoiceChat} />
          <ActionPill label="Ghost chat" Icon={Ghost} onPress={() => handleNewChat(true)} />
          <ActionPill label="Start a Room" Icon={Users2} onPress={handleStartRoom} />
          <ActionPill label="Memory Map" Icon={Orbit} onPress={() => router.push('/(app)/memory-map')} />
        </Animated.View>

        {/* Recent conversations */}
        <Animated.View entering={FadeInUp.delay(320).springify().damping(16)} className="mt-7">
          <Text className="mb-2.5 text-sm font-semibold text-ink-secondary-light dark:text-ink-secondary">
            Recent conversations
          </Text>
          {visibleConversations.length === 0 && (
            <Text className="mt-2 text-center text-ink-muted-light dark:text-ink-muted">
              No conversations yet — start one above
            </Text>
          )}
          {visibleConversations.slice(0, 8).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/(app)/chat/${c.id}`)}
              accessibilityRole="button"
              accessibilityLabel={c.title}
              className="mb-2 flex-row items-center gap-3 rounded-xl border border-border-light bg-white p-3.5 active:opacity-70 dark:border-border dark:bg-surface"
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
                <MessageSquare size={16} color={color.brand.DEFAULT} strokeWidth={2} />
              </View>
              <Text numberOfLines={1} className="flex-1 text-[15px] text-ink-primary-light dark:text-ink-primary">
                {c.title}
              </Text>
              <ChevronRight size={16} color="#71717A" />
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
