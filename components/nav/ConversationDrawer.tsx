import { View, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConversationList } from './ConversationList';
import { useNavStore } from '../../store/navStore';

/** Mobile-only: the conversation list lives in a drawer since there's no room for a persistent sidebar. */
export function ConversationDrawer() {
  const drawerOpen = useNavStore((s) => s.drawerOpen);
  const closeDrawer = useNavStore((s) => s.closeDrawer);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={closeDrawer}>
      <View className="flex-1 flex-row">
        <View
          style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}
          className="w-72 border-r border-border-light bg-bg-light px-3 dark:border-border dark:bg-bg-dark"
        >
          <ConversationList onNavigate={closeDrawer} />
        </View>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={closeDrawer}
          accessibilityRole="button"
          accessibilityLabel="Close conversation list"
        />
      </View>
    </Modal>
  );
}
