import type { Message } from '../types/db';

/**
 * Messages form a tree via parent_message_id (root messages have null
 * parent). "Editing" a past message doesn't overwrite it — it inserts a
 * sibling under the same parent, so the original branch stays reachable.
 */

export function childrenOf(messages: Message[], parentId: string | null): Message[] {
  return messages
    .filter((m) => m.parent_message_id === parentId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Walks from a leaf up to the root and returns the path in root-first order. */
export function pathToLeaf(messages: Message[], leafId: string): Message[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const path: Message[] = [];
  let current: Message | undefined = byId.get(leafId);
  while (current) {
    path.push(current);
    current = current.parent_message_id ? byId.get(current.parent_message_id) : undefined;
  }
  return path.reverse();
}

/** The tip of the longest/most recent chain — used when no branch has been explicitly selected. */
export function defaultLeaf(messages: Message[]): string | null {
  if (messages.length === 0) return null;
  const parentIds = new Set(messages.map((m) => m.parent_message_id).filter(Boolean));
  const leaves = messages.filter((m) => !parentIds.has(m.id));
  const pool = leaves.length > 0 ? leaves : messages;
  return pool.reduce((latest, m) => (m.created_at > latest.created_at ? m : latest), pool[0]).id;
}

/** Follows the most-recently-created child at each step to find a subtree's tip. */
export function deepestDescendant(messages: Message[], startId: string): string {
  let currentId = startId;
  for (;;) {
    const kids = childrenOf(messages, currentId);
    if (kids.length === 0) return currentId;
    currentId = kids[kids.length - 1].id;
  }
}

export interface BranchPath {
  leafId: string;
  path: Message[];
}

/** Enumerates every root-to-leaf path in the tree, for the branch timeline view. */
export function allBranchPaths(messages: Message[]): BranchPath[] {
  const parentIds = new Set(messages.map((m) => m.parent_message_id).filter(Boolean));
  const leaves = messages.filter((m) => !parentIds.has(m.id));
  return leaves.map((leaf) => ({ leafId: leaf.id, path: pathToLeaf(messages, leaf.id) }));
}
