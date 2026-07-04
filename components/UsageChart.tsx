import { View, Text } from 'react-native';

import type { DailyUsagePoint } from '../lib/stats';

/** Native fallback — a plain total, no chart yet. The animated Recharts version is web-only (see UsageChart.web.tsx). */
export function UsageChart({ data }: { data: DailyUsagePoint[] }) {
  const total = data.reduce((sum, p) => sum + p.count, 0);
  return (
    <View className="rounded-xl border border-border-light bg-white p-4 dark:border-border dark:bg-surface">
      <Text className="text-sm font-semibold text-ink-primary-light dark:text-ink-primary">
        {total} messages in the last {data.length} days
      </Text>
    </View>
  );
}
