import { useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';

import { AppHeader } from '../nav/AppHeader';
import { buildMemoryMap, colorForRecency, type MemoryMapData, type MemoryNode } from '../../lib/memoryMap';
import { color } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

/**
 * Native gets a simpler 2D node graph (a flattened projection of the same
 * x/z coordinates the web galaxy uses, so a conversation lands in roughly
 * the same relative spot either way) instead of the full R3F scene — no
 * Framer Motion or WebGL dependency, keeps native performance predictable.
 */
export function NativeMemoryMap() {
  const session = useAuthStore((s) => s.session);
  const { width } = useWindowDimensions();
  const [data, setData] = useState<MemoryMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemoryNode | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    buildMemoryMap(session.user.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  const size = Math.min(width - 32, 420);
  const scale = size / 16; // node positions roughly span [-6.5, 6.5]

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <AppHeader title="Memory Map" showBack />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={color.brand.DEFAULT} />
        </View>
      ) : !data || data.nodes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-ink-muted-light dark:text-ink-muted">
            Start a few conversations and they'll show up here.
          </Text>
        </View>
      ) : (
        <View className="flex-1 items-center pt-4">
          <Svg width={size} height={size}>
            {data.clusters.map((cluster) => (
              <SvgText
                key={cluster.id}
                x={size / 2 + cluster.position[0] * scale}
                y={size / 2 + cluster.position[1] * scale - 14}
                fontSize={11}
                fill={color.brand.DEFAULT}
                textAnchor="middle"
              >
                {cluster.label}
              </SvgText>
            ))}
            {data.nodes.map((node) => (
              <Circle
                key={node.conversation.id}
                cx={size / 2 + node.position[0] * scale}
                cy={size / 2 + node.position[1] * scale}
                r={4 + node.weight * 2.2}
                fill={colorForRecency(node.recency)}
                onPress={() => setSelected(node)}
              />
            ))}
          </Svg>

          {selected && (
            <View className="mt-4 w-full max-w-sm gap-2 rounded-xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface">
              <Text numberOfLines={1} className="text-sm font-semibold text-ink-primary-light dark:text-ink-primary">
                {selected.conversation.title}
              </Text>
              <Text className="text-xs text-ink-muted-light dark:text-ink-muted">
                Last active {new Date(selected.conversation.updated_at).toLocaleDateString()}
              </Text>
              <Pressable
                onPress={() => router.push(`/(app)/chat/${selected.conversation.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Jump to chat: ${selected.conversation.title}`}
                className="mt-1 items-center rounded-lg bg-brand py-2.5"
              >
                <Text className="text-sm font-semibold text-white">Jump to Chat</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
