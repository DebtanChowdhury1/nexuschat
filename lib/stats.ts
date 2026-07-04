import { supabase } from './supabase';

export interface UsageStats {
  conversationCount: number;
  messageCount: number;
}

export async function getUsageStats(userId: string): Promise<UsageStats> {
  const { count: conversationCount, error: convError } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (convError) throw convError;

  const { data: conversationIds, error: idsError } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId);
  if (idsError) throw idsError;

  const ids = (conversationIds ?? []).map((c) => c.id);
  if (ids.length === 0) return { conversationCount: conversationCount ?? 0, messageCount: 0 };

  const { count: messageCount, error: msgError } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids);
  if (msgError) throw msgError;

  return { conversationCount: conversationCount ?? 0, messageCount: messageCount ?? 0 };
}

export interface DailyUsagePoint {
  date: string;
  count: number;
}

/**
 * Real per-day message counts for the last `days` days, derived from actual
 * message timestamps — not synthetic data. Days with no activity are
 * included as zero so the chart has a continuous axis.
 */
export async function getDailyUsage(userId: string, days = 30): Promise<DailyUsagePoint[]> {
  const { data: conversationIds, error: idsError } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId);
  if (idsError) throw idsError;
  const ids = (conversationIds ?? []).map((c) => c.id);

  // Bucketed entirely in UTC calendar days — Postgres returns `created_at` as
  // UTC, so mixing in local-midnight dates here would shift messages into
  // the wrong bucket (or drop them off the edge) for any positive UTC-offset
  // timezone.
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const sinceUTC = todayUTC - (days - 1) * 86_400_000;

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(new Date(sinceUTC + i * 86_400_000).toISOString().slice(0, 10), 0);
  }

  if (ids.length > 0) {
    const { data, error } = await supabase
      .from('messages')
      .select('created_at')
      .eq('role', 'user')
      .in('conversation_id', ids)
      .gte('created_at', new Date(sinceUTC).toISOString());
    if (error) throw error;
    for (const row of data ?? []) {
      const day = row.created_at.slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}
