import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useColorScheme } from 'nativewind';

import { color } from '../constants/theme';
import type { DailyUsagePoint } from '../lib/stats';

function formatTick(dateStr: unknown): string {
  if (typeof dateStr !== 'string') return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Web-only animated usage chart — a gradient-filled area chart of real per-day message counts. */
export function UsageChart({ data }: { data: DailyUsagePoint[] }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#A1A1AA' : '#52525B';

  return (
    <div
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      style={{ borderRadius: 16, border: '1px solid', padding: '16px 8px 8px' }}
    >
      <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 16px' }}>
        Messages, last {data.length} days
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.brand.DEFAULT} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color.brand.DEFAULT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fill: textColor, fontSize: 11 }}
            interval={Math.ceil(data.length / 6)}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            labelFormatter={formatTick}
            contentStyle={{
              background: isDark ? '#1A1A1F' : '#FFFFFF',
              border: `1px solid ${gridColor}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color.brand.DEFAULT}
            strokeWidth={2}
            fill="url(#usageGradient)"
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
