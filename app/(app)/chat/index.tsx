import { View, Text, useWindowDimensions } from 'react-native';

import { AIOrb } from '../../../components/AIOrb';
import { AppHeader } from '../../../components/nav/AppHeader';
import { ConversationList } from '../../../components/nav/ConversationList';
import { usePageTitle } from '../../../lib/usePageTitle';

export default function ChatIndexScreen() {
  usePageTitle('Chats');
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  if (isWide) {
    // The persistent sidebar (rendered by (app)/_layout.tsx) already lists
    // every conversation on wide screens — this is just the empty state.
    return (
      <View className="flex-1 bg-bg-light dark:bg-bg-dark">
        <AppHeader title="NexusChat" />
        <View className="flex-1 items-center justify-center">
          <AIOrb active={false} />
          <Text className="mt-4 text-ink-muted-light dark:text-ink-muted">
            Select a conversation or start a new chat
          </Text>
        </View>
      </View>
    );
  }

  // On mobile there's no persistent sidebar, so this screen (the "Chats"
  // tab) is the conversation list itself.
  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AppHeader title="Chats" />
      <View className="flex-1 p-3">
        <ConversationList />
      </View>
    </View>
  );
}
