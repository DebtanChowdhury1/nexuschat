import type { Conversation, Message } from '../types/db';

// A tiny in-memory stand-in for the handful of supabase-js query patterns
// chatStore.sendMessage actually uses: from(table).update(patch).eq(...).eq(...).select().single()
// and from(table).insert(patch).select().single(), each awaited directly.
function makeFakeSupabase(initial: { conversations: Conversation[]; messages: Message[] }) {
  const db = { conversations: [...initial.conversations], messages: [...initial.messages] };
  let nextId = 1;

  function builder(table: 'conversations' | 'messages') {
    let op: 'update' | 'insert' | null = null;
    let payload: Record<string, unknown> = {};
    const filters: Array<[string, unknown]> = [];
    let wantSingle = false;

    const api = {
      update(patch: Record<string, unknown>) {
        op = 'update';
        payload = patch;
        return api;
      },
      insert(patch: Record<string, unknown>) {
        op = 'insert';
        payload = patch;
        return api;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return api;
      },
      select() {
        return api;
      },
      single() {
        wantSingle = true;
        return api;
      },
      then(resolve: (v: unknown) => void) {
        const rows = db[table] as unknown as Record<string, unknown>[];
        if (op === 'update') {
          const matched = rows.filter((r) => filters.every(([c, v]) => r[c] === v));
          matched.forEach((r) => Object.assign(r, payload));
          if (wantSingle) {
            resolve({ data: matched[0] ?? null, error: matched[0] ? null : { message: 'no rows' } });
          } else {
            resolve({ data: matched, error: null });
          }
        } else if (op === 'insert') {
          const row = { id: `msg-${nextId++}`, created_at: new Date(Date.now() + nextId).toISOString(), ...payload };
          rows.push(row);
          resolve({ data: wantSingle ? row : [row], error: null });
        } else {
          resolve({ data: null, error: { message: 'unsupported op in test double' } });
        }
      },
    };
    return api;
  }

  return { supabase: { from: builder }, db };
}

jest.mock('../lib/ai', () => ({
  streamChatCompletion: jest.fn().mockResolvedValue({ provider: 'groq', content: 'Hi there!' }),
}));

describe('chatStore.sendMessage concurrency guard', () => {
  const conversationId = 'conv-1';

  function freshConversation(isGenerating: boolean): Conversation {
    return {
      id: conversationId,
      user_id: 'user-1',
      title: 'Test chat',
      is_generating: isGenerating,
      active_model: null,
      is_pinned: false,
      is_temporary: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  async function loadStoreWithFakeSupabase(isGenerating: boolean) {
    const fake = makeFakeSupabase({ conversations: [freshConversation(isGenerating)], messages: [] });
    jest.doMock('../lib/supabase', () => ({ supabase: fake.supabase }));
    let useChatStore: typeof import('../store/chatStore').useChatStore;
    jest.isolateModules(() => {
      ({ useChatStore } = require('../store/chatStore'));
    });
    return { useChatStore: useChatStore!, db: fake.db };
  }

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../lib/supabase');
  });

  it('rejects sending when another device already holds the generation lock', async () => {
    const { useChatStore } = await loadStoreWithFakeSupabase(true);
    await expect(useChatStore.getState().sendMessage(conversationId, 'hello')).rejects.toThrow(
      'Another device is already generating a response'
    );
  });

  it('persists the user message and streamed assistant reply, then releases the lock', async () => {
    const { useChatStore, db } = await loadStoreWithFakeSupabase(false);

    await useChatStore.getState().sendMessage(conversationId, 'hello');

    const messages = db.messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'user', content: 'hello' });
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'Hi there!', model_used: 'groq' });

    const conversation = db.conversations[0];
    expect(conversation.is_generating).toBe(false);
    expect(conversation.active_model).toBe('groq');
  });
});

describe('chatStore.sendMessage history truncation', () => {
  const conversationId = 'conv-long';

  function freshConversation(): Conversation {
    return {
      id: conversationId,
      user_id: 'user-1',
      title: 'Long chat',
      is_generating: false,
      active_model: null,
      is_pinned: false,
      is_temporary: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../lib/supabase');
    jest.dontMock('../lib/ai');
  });

  it('caps the history sent to the model regardless of how long the conversation actually is', async () => {
    const fake = makeFakeSupabase({ conversations: [freshConversation()], messages: [] });
    jest.doMock('../lib/supabase', () => ({ supabase: fake.supabase }));
    const streamChatCompletion = jest.fn().mockResolvedValue({ provider: 'groq', content: 'Hi there!' });
    jest.doMock('../lib/ai', () => ({ streamChatCompletion }));

    let useChatStore: typeof import('../store/chatStore').useChatStore;
    jest.isolateModules(() => {
      ({ useChatStore } = require('../store/chatStore'));
    });

    // Build a long alternating user/assistant chain — 60 turns, well past
    // MAX_HISTORY_TURNS (40) — as an existing conversation already in state.
    const longChain: Message[] = [];
    let parentId: string | null = null;
    for (let i = 0; i < 60; i += 1) {
      const id = `old-msg-${i}`;
      longChain.push({
        id,
        conversation_id: conversationId,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `turn ${i}`,
        model_used: null,
        parent_message_id: parentId,
        branch_root_id: null,
        sender_name: null,
        sender_color: null,
        created_at: new Date(2026, 0, 1, 0, i).toISOString(),
      });
      parentId = id;
    }
    useChatStore!.setState({
      messagesByConversation: { [conversationId]: longChain },
      activeLeafByConversation: { [conversationId]: parentId },
    });

    await useChatStore!.getState().sendMessage(conversationId, 'one more message', parentId);

    const turns = streamChatCompletion.mock.calls[0][0] as { role: string; content: string }[];
    // 40 history turns + the 2 prepended system messages (date/time,
    // response style) = 42, regardless of the 61 real ancestor messages
    // (60 pre-existing + the one just sent) available in state.
    expect(turns.length).toBeLessThanOrEqual(42);
    // The most recent turns must survive truncation, not the oldest ones.
    expect(turns.some((t) => t.content === 'one more message')).toBe(true);
    expect(turns.some((t) => t.content === 'turn 0')).toBe(false);
  });
});

describe('chatStore.clearStaleGenerationLock', () => {
  const conversationId = 'conv-stale';

  function conversationWithLock(isGenerating: boolean, updatedAt: string): Conversation {
    return {
      id: conversationId,
      user_id: 'user-1',
      title: 'Test chat',
      is_generating: isGenerating,
      active_model: null,
      is_pinned: false,
      is_temporary: false,
      created_at: updatedAt,
      updated_at: updatedAt,
    };
  }

  async function loadStoreWithConversation(conversation: Conversation) {
    const fake = makeFakeSupabase({ conversations: [conversation], messages: [] });
    jest.doMock('../lib/supabase', () => ({ supabase: fake.supabase }));
    let useChatStore: typeof import('../store/chatStore').useChatStore;
    jest.isolateModules(() => {
      ({ useChatStore } = require('../store/chatStore'));
    });
    return { useChatStore: useChatStore!, db: fake.db };
  }

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../lib/supabase');
  });

  it('leaves a fresh, legitimately-in-progress lock untouched', async () => {
    const conversation = conversationWithLock(true, new Date().toISOString());
    const { useChatStore, db } = await loadStoreWithConversation(conversation);

    await useChatStore.getState().clearStaleGenerationLock(conversation);

    expect(db.conversations[0].is_generating).toBe(true);
  });

  it('clears a lock stuck for longer than the stale threshold', async () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const conversation = conversationWithLock(true, fourMinutesAgo);
    const { useChatStore, db } = await loadStoreWithConversation(conversation);

    await useChatStore.getState().clearStaleGenerationLock(conversation);

    expect(db.conversations[0].is_generating).toBe(false);
  });

  it('does nothing for a conversation that was never generating', async () => {
    const conversation = conversationWithLock(false, new Date(Date.now() - 10 * 60 * 1000).toISOString());
    const { useChatStore, db } = await loadStoreWithConversation(conversation);

    await useChatStore.getState().clearStaleGenerationLock(conversation);

    expect(db.conversations[0].is_generating).toBe(false);
  });
});
