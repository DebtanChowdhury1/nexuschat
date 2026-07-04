import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ghost, Pencil, Pin, Plus, Trash2 } from 'lucide-react-native';

import { Skeleton } from '../Skeleton';
import { color } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import type { Conversation } from '../../types/db';

function ConversationRow({
  conversation,
  active,
  onNavigate,
}: {
  conversation: Conversation;
  active: boolean;
  onNavigate?: () => void;
}) {
  const renameConversation = useChatStore((s) => s.renameConversation);
  const togglePin = useChatStore((s) => s.togglePin);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);

  const commitRename = () => {
    setEditing(false);
    if (draftTitle.trim() && draftTitle !== conversation.title) {
      renameConversation(conversation.id, draftTitle.trim());
    } else {
      setDraftTitle(conversation.title);
    }
  };

  if (editing) {
    return (
      <View className="flex-row items-center gap-2 rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5">
        <TextInput
          value={draftTitle}
          onChangeText={setDraftTitle}
          autoFocus
          onSubmitEditing={commitRename}
          onBlur={commitRename}
          accessibilityLabel="Conversation title"
          className="flex-1 text-ink-primary-light dark:text-ink-primary"
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        router.push(`/(app)/chat/${conversation.id}`);
        onNavigate?.();
      }}
      className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
        active ? 'bg-brand/20' : 'active:bg-black/5 dark:active:bg-white/5'
      }`}
      // Deliberately no accessibilityRole="button" here — this row contains
      // its own nested action buttons (Pin/Rename/Delete below), and on web
      // react-native-web renders role="button" as a literal <button> tag;
      // nesting one inside another is invalid HTML and breaks hydration.
      // The label still describes the row for screen readers.
      accessibilityLabel={`Open conversation: ${conversation.title}${conversation.is_pinned ? ', pinned' : ''}`}
      accessibilityState={{ selected: active }}
    >
      <View className="flex-1 flex-row items-center gap-2">
        {conversation.is_pinned && <Pin size={13} color={color.brand.DEFAULT} strokeWidth={2.2} />}
        {conversation.is_generating && <Text className="text-xs text-brand-light">●</Text>}
        <Text numberOfLines={1} className="flex-1 text-ink-primary-light dark:text-ink-primary">
          {conversation.title}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => togglePin(conversation.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={conversation.is_pinned ? 'Unpin conversation' : 'Pin conversation'}
        >
          <Pin size={15} color={conversation.is_pinned ? color.brand.DEFAULT : '#71717A'} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => setEditing(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Rename conversation"
        >
          <Pencil size={15} color="#71717A" strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => deleteConversation(conversation.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete conversation"
        >
          <Trash2 size={15} color="#71717A" strokeWidth={2} />
        </Pressable>
      </View>
    </Pressable>
  );
}

/**
 * The conversation list + "new chat" button, shared between the persistent
 * web sidebar and the mobile drawer. `onNavigate` lets the mobile drawer
 * close itself after a row is tapped.
 */
export function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const session = useAuthStore((s) => s.session);
  const conversations = useChatStore((s) => s.conversations);
  const conversationsLoading = useChatStore((s) => s.conversationsLoading);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const params = useLocalSearchParams<{ id?: string }>();

  // Temporary chats live in local state (so the open chat screen can look up
  // its title) but never in the visible history list — same as ChatGPT.
  const visibleConversations = conversations.filter((c) => !c.is_temporary);

  useEffect(() => {
    if (session?.user.id) loadConversations(session.user.id);
  }, [session?.user.id, loadConversations]);

  const startChat = async (isTemporary: boolean) => {
    if (!session?.user.id) return;
    const conversation = await createConversation(session.user.id, isTemporary);
    router.push(`/(app)/chat/${conversation.id}`);
    onNavigate?.();
  };

  return (
    <View className="flex-1">
      <Pressable
        onPress={() => startChat(false)}
        className="mb-2 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3 active:opacity-80 hover:opacity-90"
        accessibilityRole="button"
        accessibilityLabel="New chat"
      >
        <Plus size={16} color="#fff" strokeWidth={2.5} />
        <Text className="font-semibold text-white">New chat</Text>
      </Pressable>
      <Pressable
        onPress={() => startChat(true)}
        className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-border-light py-2.5 active:bg-black/5 hover:bg-black/5 dark:border-border dark:active:bg-white/5 dark:hover:bg-white/5"
        accessibilityRole="button"
        accessibilityLabel="Start a temporary chat"
        accessibilityHint="Temporary chats are not saved to your history"
      >
        <Ghost size={15} color="#71717A" strokeWidth={2} />
        <Text className="text-sm font-medium text-ink-secondary-light dark:text-ink-secondary">
          Temporary chat
        </Text>
      </Pressable>

      {conversationsLoading && visibleConversations.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Skeleton height={38} radius={8} />
          <Skeleton height={38} radius={8} width="80%" />
          <Skeleton height={38} radius={8} width="90%" />
        </View>
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationRow conversation={item} active={item.id === params.id} onNavigate={onNavigate} />
          )}
          contentContainerStyle={{ gap: 2 }}
          ListEmptyComponent={
            <Text className="mt-6 text-center text-ink-muted-light dark:text-ink-muted">No conversations yet</Text>
          }
        />
      )}
    </View>
  );
}
