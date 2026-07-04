import {
  allBranchPaths,
  childrenOf,
  deepestDescendant,
  defaultLeaf,
  pathToLeaf,
} from '../lib/branching';
import type { Message } from '../types/db';

function msg(id: string, parent: string | null, overrides: Partial<Message> = {}): Message {
  return {
    id,
    conversation_id: 'c1',
    role: 'user',
    content: id,
    model_used: null,
    parent_message_id: parent,
    branch_root_id: null,
    created_at: overrides.created_at ?? `2026-01-01T00:00:0${id}.000Z`,
    ...overrides,
  };
}

describe('branching helpers', () => {
  // Tree: root -> a -> b (original branch)
  //              a -> c (edited sibling of b) -> d
  const messages: Message[] = [
    msg('0', null, { created_at: '2026-01-01T00:00:00.000Z' }),
    msg('a', '0', { created_at: '2026-01-01T00:00:01.000Z' }),
    msg('b', 'a', { created_at: '2026-01-01T00:00:02.000Z' }),
    msg('c', 'a', { created_at: '2026-01-01T00:00:03.000Z' }), // edited version of b, created later
    msg('d', 'c', { created_at: '2026-01-01T00:00:04.000Z' }),
  ];

  it('childrenOf returns direct children sorted by creation time', () => {
    const kids = childrenOf(messages, 'a');
    expect(kids.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('pathToLeaf walks from a leaf back to the root, root-first', () => {
    expect(pathToLeaf(messages, 'd').map((m) => m.id)).toEqual(['0', 'a', 'c', 'd']);
    expect(pathToLeaf(messages, 'b').map((m) => m.id)).toEqual(['0', 'a', 'b']);
  });

  it('defaultLeaf picks the most recently created leaf when no branch is explicitly selected', () => {
    // 'b' and 'd' are the only leaves (nothing is parented to them); 'd' is newer.
    expect(defaultLeaf(messages)).toBe('d');
  });

  it('defaultLeaf returns null for an empty conversation', () => {
    expect(defaultLeaf([])).toBeNull();
  });

  it('deepestDescendant follows the newest child at each step', () => {
    expect(deepestDescendant(messages, 'a')).toBe('d');
    expect(deepestDescendant(messages, 'b')).toBe('b'); // b has no children
  });

  it('allBranchPaths enumerates every root-to-leaf path exactly once', () => {
    const branches = allBranchPaths(messages);
    const leafIds = branches.map((b) => b.leafId).sort();
    expect(leafIds).toEqual(['b', 'd']);
    const original = branches.find((b) => b.leafId === 'b')!;
    expect(original.path.map((m) => m.id)).toEqual(['0', 'a', 'b']);
  });
});
