import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

import { AIOrb } from '../../components/AIOrb';
import { AppHeader } from '../../components/nav/AppHeader';
import { color } from '../../constants/theme';
import { FEATURES } from '../../constants/features';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { usePageTitle } from '../../lib/usePageTitle';

/** Native "Home" tab — the landing-page experience (hero orb, gradient CTA, feature showcase) adapted for mobile. */
export default function HomeScreen() {
  usePageTitle('NexusChat');
  const session = useAuthStore((s) => s.session);
  const getOrCreateDraftConversation = useChatStore((s) => s.getOrCreateDraftConversation);

  const handleStartChat = async () => {
    if (!session?.user.id) return;
    const conversation = await getOrCreateDraftConversation(session.user.id);
    router.push(`/(app)/chat/${conversation.id}`);
  };

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AppHeader title="NexusChat" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.springify().damping(16)} className="items-center pb-2 pt-6">
          <AIOrb active size={140} />
          <Text className="mt-5 text-center text-3xl font-bold leading-tight text-ink-primary-light dark:text-ink-primary">
            The AI chat that lives on{' '}
            <Text className="text-brand">every device</Text>
          </Text>
          <Text className="mt-3 max-w-xs text-center text-[15px] leading-5 text-ink-secondary-light dark:text-ink-secondary">
            Start a conversation on your phone, keep typing on the web — live, synced, and fully
            transparent about which AI answered.
          </Text>

          <Pressable
            onPress={handleStartChat}
            accessibilityRole="button"
            accessibilityLabel="Start chatting"
            className="mt-6 w-full active:opacity-85"
          >
            <LinearGradient
              colors={[color.brand.DEFAULT, color.accent2.DEFAULT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 14,
                paddingVertical: 14,
              }}
            >
              <Text className="text-base font-semibold text-white">Start chatting</Text>
              <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/dashboard')}
            accessibilityRole="button"
            accessibilityLabel="Open dashboard"
            className="mt-3 w-full items-center rounded-xl border border-border-light py-3 active:bg-black/5 dark:border-border dark:active:bg-white/5"
          >
            <Text className="text-[15px] font-semibold text-ink-primary-light dark:text-ink-primary">
              Open dashboard
            </Text>
          </Pressable>
        </Animated.View>

        {/* Features */}
        <Text className="mb-4 mt-10 text-center text-xs font-semibold uppercase tracking-widest text-ink-muted-light dark:text-ink-muted">
          Not just another chat template
        </Text>
        {FEATURES.map((feature, i) => (
          <Animated.View
            key={feature.title}
            entering={FadeInUp.delay(150 + i * 70).springify().damping(16)}
            className="mb-3 flex-row gap-3.5 rounded-2xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface"
          >
            <LinearGradient
              colors={[`${color.brand.DEFAULT}33`, `${color.accent2.DEFAULT}33`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <feature.Icon size={19} color={color.brand.DEFAULT} strokeWidth={2} />
            </LinearGradient>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink-primary-light dark:text-ink-primary">
                {feature.title}
              </Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-ink-secondary-light dark:text-ink-secondary">
                {feature.body}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
