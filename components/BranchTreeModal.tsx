import { Modal, View, Text, Pressable, ScrollView } from 'react-native';

import { color } from '../constants/theme';
import { allBranchPaths } from '../lib/branching';
import { useChatStore, EMPTY_MESSAGES } from '../store/chatStore';

interface BranchTreeModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
}

/** Git-branch-style timeline: one row per root-to-leaf path in the message tree, connected by a spine. */
export function BranchTreeModal({ visible, onClose, conversationId }: BranchTreeModalProps) {
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES);
  const activeLeaf = useChatStore((s) => s.activeLeafByConversation[conversationId]);
  const setActiveLeaf = useChatStore((s) => s.setActiveLeaf);

  const branches = allBranchPaths(messages);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[80%] rounded-t-2xl bg-bg-light p-4 dark:bg-[#14141f]">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink-primary-light dark:text-ink-primary">
              Version history
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text className="text-ink-secondary-light dark:text-ink-secondary">Close</Text>
            </Pressable>
          </View>
          <ScrollView>
            {branches.map((branch, i) => {
              const isActive = branch.leafId === activeLeaf;
              const isLast = i === branches.length - 1;
              const firstUser = branch.path.find((m) => m.role === 'user');
              return (
                <View key={branch.leafId} className="flex-row">
                  <View className="mr-3 items-center" style={{ width: 16 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        marginTop: 14,
                        backgroundColor: isActive ? color.brand.DEFAULT : 'rgba(128,128,128,0.4)',
                      }}
                    />
                    {!isLast && (
                      <View
                        style={{ flex: 1, width: 2, backgroundColor: 'rgba(128,128,128,0.25)', marginTop: 2 }}
                      />
                    )}
                  </View>
                  <Pressable
                    onPress={() => {
                      setActiveLeaf(conversationId, branch.leafId);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Version ${i + 1}, ${branch.path.length} messages${isActive ? ', current' : ''}`}
                    className={`mb-3 flex-1 rounded-xl border p-3 ${
                      isActive
                        ? 'border-brand bg-brand/10'
                        : 'border-border-light bg-black/[0.03] dark:border-border dark:bg-white/5'
                    }`}
                  >
                    <Text className="mb-1 text-xs text-ink-muted-light dark:text-ink-muted">
                      Version {i + 1} · {branch.path.length} messages
                    </Text>
                    <Text numberOfLines={2} className="text-ink-secondary-light dark:text-ink-secondary">
                      {firstUser?.content ?? '(empty)'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
