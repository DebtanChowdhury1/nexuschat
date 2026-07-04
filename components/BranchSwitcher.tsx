import { View, Text, Pressable } from 'react-native';

import { childrenOf, deepestDescendant } from '../lib/branching';
import { useChatStore, EMPTY_MESSAGES } from '../store/chatStore';
import type { Message } from '../types/db';

/** Shown above a message when it has sibling versions (i.e. it was edited at some point). */
export function BranchSwitcher({ conversationId, message }: { conversationId: string; message: Message }) {
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES);
  const setActiveLeaf = useChatStore((s) => s.setActiveLeaf);

  const siblings = childrenOf(messages, message.parent_message_id);
  if (siblings.length <= 1) return null;

  const index = siblings.findIndex((m) => m.id === message.id);

  const go = (delta: number) => {
    const nextIndex = (index + delta + siblings.length) % siblings.length;
    const nextLeaf = deepestDescendant(messages, siblings[nextIndex].id);
    setActiveLeaf(conversationId, nextLeaf);
  };

  return (
    <View
      className={`mb-1 flex-row items-center gap-1 self-center rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10 ${
        message.role === 'user' ? 'self-end' : 'self-start'
      }`}
    >
      <Pressable
        onPress={() => go(-1)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Previous version"
      >
        <Text className="text-ink-muted-light dark:text-ink-muted">‹</Text>
      </Pressable>
      <Text className="text-xs text-ink-muted-light dark:text-ink-muted">
        version {index + 1}/{siblings.length}
      </Text>
      <Pressable
        onPress={() => go(1)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Next version"
      >
        <Text className="text-ink-muted-light dark:text-ink-muted">›</Text>
      </Pressable>
    </View>
  );
}
