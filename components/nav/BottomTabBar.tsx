import { View, Text, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutDashboard, MessageCircle, Plus, User } from 'lucide-react-native';

import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

const ACTIVE_COLOR = '#FF5A36';
const INACTIVE_COLOR = '#71717A';

const TABS = [
  { key: 'home', label: 'Home', Icon: Home, match: '/home' },
  { key: 'chats', label: 'Chats', Icon: MessageCircle, match: '/chat' },
  { key: 'new', label: 'New chat', Icon: Plus, match: null },
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, match: '/dashboard' },
  { key: 'profile', label: 'Profile', Icon: User, match: '/profile' },
] as const;

/** Mobile-only bottom tab bar — Home / Chats / New Chat / Dashboard / Profile. */
export function BottomTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const getOrCreateDraftConversation = useChatStore((s) => s.getOrCreateDraftConversation);

  const handlePress = async (tab: (typeof TABS)[number]) => {
    if (tab.key === 'new') {
      if (!session?.user.id) return;
      const conversation = await getOrCreateDraftConversation(session.user.id);
      router.replace(`/(app)/chat/${conversation.id}`);
      return;
    }
    if (tab.key === 'home') router.push('/(app)/home');
    if (tab.key === 'dashboard') router.push('/(app)/dashboard');
    if (tab.key === 'chats') router.push('/(app)/chat');
    if (tab.key === 'profile') router.push('/(app)/profile');
  };

  return (
    <View
      style={{ paddingBottom: insets.bottom }}
      className="flex-row border-t border-border-light bg-bg-light dark:border-border dark:bg-bg-dark"
    >
      {TABS.map((tab) => {
        const active = tab.match ? pathname.includes(tab.match) : false;
        const iconColor = active ? ACTIVE_COLOR : INACTIVE_COLOR;
        // "New chat" gets a filled brand pill so the primary action stands out.
        if (tab.key === 'new') {
          return (
            <Pressable
              key={tab.key}
              onPress={() => handlePress(tab)}
              className="flex-1 items-center justify-center py-2"
              accessibilityRole="button"
              accessibilityLabel="New chat"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
                <Plus size={21} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.key}
            onPress={() => handlePress(tab)}
            className="flex-1 items-center gap-1 py-2.5"
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <tab.Icon size={21} color={iconColor} strokeWidth={active ? 2.4 : 2} />
            <Text
              className={`text-[10px] ${
                active ? 'font-semibold text-brand' : 'text-ink-muted-light dark:text-ink-muted'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
