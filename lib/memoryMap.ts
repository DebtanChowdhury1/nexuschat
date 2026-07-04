import { supabase } from './supabase';
import {
  anchorForCluster,
  clusterConversations,
  clusterLabel,
  computeTfIdf,
  nodeOffset,
  type ConversationDoc,
} from './topicClustering';
import { color } from '../constants/theme';
import type { Conversation } from '../types/db';

export interface MemoryNode {
  conversation: Conversation;
  position: [number, number, number];
  /** 0 (just now) to 1 (oldest in the set) — drives the Ember→cool-dim color fade. */
  recency: number;
  /** Relative node size driver — sqrt-scaled message count. */
  weight: number;
  clusterId: string;
}

export interface MemoryCluster {
  id: string;
  label: string;
  position: [number, number, number];
  size: number;
}

export interface MemoryMapData {
  nodes: MemoryNode[];
  clusters: MemoryCluster[];
}

const MAX_MESSAGES_FETCHED = 3000; // free-tier-friendly ceiling

/**
 * Builds the whole Memory Map dataset for one user: fetches conversations +
 * a bounded window of their messages, clusters them by topic, and assigns
 * each conversation a stable 3D position (recomputed each visit from the
 * same seeded hash, so the layout doesn't jump around).
 */
export async function buildMemoryMap(userId: string): Promise<MemoryMapData> {
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_temporary', false);
  if (convError) throw convError;
  if (!conversations || conversations.length === 0) return { nodes: [], clusters: [] };

  const ids = conversations.map((c) => c.id);
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES_FETCHED);
  if (msgError) throw msgError;

  const messagesByConversation = new Map<string, string[]>();
  const countByConversation = new Map<string, number>();
  for (const m of messages ?? []) {
    countByConversation.set(m.conversation_id, (countByConversation.get(m.conversation_id) ?? 0) + 1);
    const bucket = messagesByConversation.get(m.conversation_id) ?? [];
    if (bucket.length < 3) bucket.push(m.content);
    messagesByConversation.set(m.conversation_id, bucket);
  }

  const docs: ConversationDoc[] = conversations.map((c) => ({
    id: c.id,
    text: [c.title, ...(messagesByConversation.get(c.id) ?? [])].join(' '),
  }));

  const vectors = computeTfIdf(docs);
  const clusters = clusterConversations(vectors);

  const times = conversations.map((c) => new Date(c.updated_at).getTime());
  const oldest = Math.min(...times);
  const newest = Math.max(...times, oldest + 1); // avoid /0 when every conversation shares one timestamp

  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const memberCluster = new Map<string, string>();
  for (const cluster of clusters) for (const memberId of cluster.memberIds) memberCluster.set(memberId, cluster.id);

  const nodes: MemoryNode[] = conversations.map((conversation) => {
    const clusterId = memberCluster.get(conversation.id) ?? 'cluster-0';
    const anchor = anchorForCluster(clusterId);
    const offset = nodeOffset(conversation.id);
    const position: [number, number, number] = [
      anchor[0] + offset[0],
      anchor[1] + offset[1],
      anchor[2] + offset[2],
    ];
    const updatedAt = new Date(conversation.updated_at).getTime();
    // 1 = most recently updated, 0 = oldest — drives the warm→cool color fade.
    const recency = (updatedAt - oldest) / (newest - oldest);
    const messageCount = countByConversation.get(conversation.id) ?? 1;
    const weight = Math.sqrt(messageCount);
    return { conversation, position, recency, weight, clusterId };
  });

  const memoryClusters: MemoryCluster[] = clusters.map((cluster) => ({
    id: cluster.id,
    label: clusterLabel(cluster),
    position: anchorForCluster(cluster.id),
    size: cluster.memberIds.length,
  }));

  return { nodes, clusters: memoryClusters };
}

/** Ember (recent, recency=1) → a dim cool gray-blue (old, recency=0), interpolated in RGB space. */
export function colorForRecency(recency: number): string {
  const warm = hexToRgb(color.brand.DEFAULT);
  const cool = { r: 0x3a, g: 0x3f, b: 0x52 };
  const t = recency;
  const r = Math.round(cool.r + (warm.r - cool.r) * t);
  const g = Math.round(cool.g + (warm.g - cool.g) * t);
  const b = Math.round(cool.b + (warm.b - cool.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}
