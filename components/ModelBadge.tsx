import { View, Text } from 'react-native';

import { color } from '../constants/theme';
import type { AIProvider } from '../types/db';

/**
 * Shows a single unified brand badge rather than naming which backend
 * provider actually answered (Groq/Gemini/OpenRouter) — those stay purely
 * an internal implementation detail (still recorded in `model_used` for our
 * own diagnostics), not user-facing. `provider` is only used to decide
 * whether a reply has finished generating yet.
 */
export function ModelBadge({ provider }: { provider: AIProvider | null }) {
  if (!provider) return null;
  return (
    <View className="mt-1 flex-row items-center gap-1.5 self-start rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/5">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.accent2.DEFAULT }} />
      <Text className="text-xs text-ink-secondary-light dark:text-ink-secondary">NexusChat AI</Text>
    </View>
  );
}
