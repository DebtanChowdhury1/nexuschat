import { create } from 'zustand';

import { streamChatCompletion } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { captureException } from '../lib/sentry';
import { pathToLeaf, defaultLeaf } from '../lib/branching';
import { currentDateTimeContext } from '../lib/currentTime';
import { buildResponseStyleInstruction } from '../lib/responseStyle';
import { buildSearchQuery, formatSearchContext, searchWeb, shouldSearchWeb } from '../lib/webSearch';
import { useSettingsStore } from './settingsStore';
import type { AIProvider, Conversation, Message } from '../types/db';

// A stable reference for "no messages yet" — selectors must never fall back
// to a fresh `[]` literal (e.g. `messagesByConversation[id] ?? []`), since a
// new array on every render trips React's "getSnapshot should be cached"
// check and infinite-loops the component.
export const EMPTY_MESSAGES: Message[] = [];

const TITLE_MAX_LENGTH = 48;

// The AI fallback chain's worst case (groq x2 attempts + gemini + openrouter,
// each up to ~35s of connect+stall timeout, plus backoff) tops out around
// 2.5 minutes — this sits safely above that so a legitimately-in-progress
// generation is never mistaken for a stale one. See clearStaleGenerationLock.
const STALE_GENERATION_TIMEOUT_MS = 3 * 60 * 1000;

// See loadMessages/sendMessage for why these exist: an unbounded
// conversation was loading and re-sending its *entire* history forever,
// which both degrades performance client-side and eventually overflows a
// provider's context window with a hard failure and no graceful fallback.
const MAX_MESSAGES_LOADED = 500;
const MAX_HISTORY_TURNS = 40; // ~20 exchanges — generous context, bounded cost/latency
const DRAFT_CONVERSATION_TITLE = 'New conversation';
const TEMPORARY_CONVERSATION_TITLE = 'Temporary chat';

const draftConversationRequests = new Map<string, Promise<Conversation>>();

/** Derives a conversation title from its first message — no separate AI call, just a clean truncation. */
function titleFromMessage(content: string): string {
  const firstLine = content.trim().split('\n')[0].trim();
  if (firstLine.length <= TITLE_MAX_LENGTH) return firstLine || 'New conversation';
  return `${firstLine.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`;
}

interface ChatState {
  conversations: Conversation[];
  conversationsLoading: boolean;
  messagesByConversation: Record<string, Message[]>;
  messagesLoadingByConversation: Record<string, boolean>;
  activeLeafByConversation: Record<string, string | null>;
  activeProvider: AIProvider | null;
  loadConversations: (userId: string) => Promise<void>;
  /** Temporary chats aren't persisted to the sidebar's list — see is_temporary on the row itself. */
  createConversation: (userId: string, isTemporary?: boolean) => Promise<Conversation>;
  /** ChatGPT-style saved draft: repeated "New chat" taps reopen the same empty chat until the user sends a message. */
  getOrCreateDraftConversation: (userId: string) => Promise<Conversation>;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  applyRemoteMessage: (message: Message) => void;
  applyRemoteConversation: (conversation: Conversation) => void;
  setActiveLeaf: (conversationId: string, leafId: string) => void;
  /**
   * Self-healing watchdog for the is_generating lock: if a client crashes,
   * loses network, or is force-quit mid-generation, the flag it set to
   * `true` has no automatic release and would otherwise block that
   * conversation from ever generating again on any device. Any client that
   * opens the conversation and finds the lock older than a generous
   * threshold (safely above the AI fallback chain's worst-case total
   * duration) clears it. No-op if the conversation isn't actually stale.
   */
  clearStaleGenerationLock: (conversation: Conversation) => Promise<void>;
  /**
   * Sends a user message and streams the assistant reply. Guarded by the
   * conversation's `is_generating` flag so a second device can't trigger a
   * second concurrent AI call on the same conversation. History sent to the
   * model is derived from the parent chain only, so it respects branches.
   */
  sendMessage: (
    conversationId: string,
    content: string,
    parentMessageId?: string | null,
    sender?: { name: string; color: string } | null
  ) => Promise<{ userMessage: Message; assistantMessage: Message }>;
  /** Edits a past message by inserting a sibling under the same parent — the original branch stays intact. */
  editAndBranch: (conversationId: string, messageId: string, newContent: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  conversationsLoading: false,
  messagesByConversation: {},
  messagesLoadingByConversation: {},
  activeLeafByConversation: {},
  activeProvider: null,

  loadConversations: async (userId) => {
    set({ conversationsLoading: true });
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_temporary', false)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    set({ conversationsLoading: false });
    if (error) throw error;
    set({ conversations: data ?? [] });
  },

  createConversation: async (userId, isTemporary = false) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: isTemporary ? TEMPORARY_CONVERSATION_TITLE : DRAFT_CONVERSATION_TITLE,
        is_temporary: isTemporary,
      })
      .select()
      .single();
    if (error) throw error;
    // Kept in local state even when temporary so the chat screen can look
    // up its title/model — just excluded from the sidebar's own filtering.
    set({ conversations: [data, ...get().conversations] });
    return data;
  },

  getOrCreateDraftConversation: async (userId) => {
    const existingRequest = draftConversationRequests.get(userId);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      const localDrafts = get().conversations.filter(
        (c) => c.user_id === userId && !c.is_temporary && c.title === DRAFT_CONVERSATION_TITLE
      );

      for (const draft of localDrafts) {
        const loadedMessages = get().messagesByConversation[draft.id];
        if (loadedMessages && loadedMessages.length === 0) return draft;
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_temporary', false)
        .eq('title', DRAFT_CONVERSATION_TITLE)
        .order('created_at', { ascending: false })
        .limit(5);
      if (candidatesError) throw candidatesError;

      for (const candidate of candidates ?? []) {
        const { count, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', candidate.id);
        if (countError) throw countError;
        if ((count ?? 0) === 0) {
          set({
            conversations: [candidate, ...get().conversations.filter((c) => c.id !== candidate.id)],
            messagesByConversation: { ...get().messagesByConversation, [candidate.id]: [] },
          });
          return candidate;
        }
      }

      return get().createConversation(userId, false);
    })().finally(() => {
      draftConversationRequests.delete(userId);
    });

    draftConversationRequests.set(userId, request);
    return request;
  },

  renameConversation: async (id, title) => {
    const { error } = await supabase.from('conversations').update({ title }).eq('id', id);
    if (error) throw error;
    set({
      conversations: get().conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    });
  },

  togglePin: async (id) => {
    const current = get().conversations.find((c) => c.id === id);
    if (!current) return;
    const is_pinned = !current.is_pinned;
    const { error } = await supabase.from('conversations').update({ is_pinned }).eq('id', id);
    if (error) throw error;
    set({
      conversations: get().conversations.map((c) => (c.id === id ? { ...c, is_pinned } : c)),
    });
  },

  deleteConversation: async (id) => {
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) throw error;
    set({ conversations: get().conversations.filter((c) => c.id !== id) });
  },

  loadMessages: async (conversationId) => {
    set({
      messagesLoadingByConversation: { ...get().messagesLoadingByConversation, [conversationId]: true },
    });
    // Caps how much history a single extreme, months-long conversation can
    // force into memory/render at once. Fetched newest-first then reversed
    // rather than just adding .limit() to the existing ascending query,
    // which would return the *oldest* N messages instead of the most
    // recent ones. Accepted tradeoff: a branch whose ancestry chain reaches
    // further back than MAX_MESSAGES_LOADED total messages in the
    // conversation would have its early ancestors missing from
    // pathToLeaf's reconstruction — a real limitation, but one that only
    // bites at a scale far beyond typical usage, and full pagination-aware
    // branch reconstruction is out of scope for this fix.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES_LOADED);
    data?.reverse();
    set({
      messagesLoadingByConversation: { ...get().messagesLoadingByConversation, [conversationId]: false },
    });
    if (error) throw error;
    const messages = data ?? [];
    set({
      messagesByConversation: { ...get().messagesByConversation, [conversationId]: messages },
      activeLeafByConversation: {
        ...get().activeLeafByConversation,
        [conversationId]: get().activeLeafByConversation[conversationId] ?? defaultLeaf(messages),
      },
    });
  },

  applyRemoteMessage: (message) => {
    const existing = get().messagesByConversation[message.conversation_id] ?? [];
    if (existing.some((m) => m.id === message.id)) {
      set({
        messagesByConversation: {
          ...get().messagesByConversation,
          [message.conversation_id]: existing.map((m) => (m.id === message.id ? message : m)),
        },
      });
      return;
    }
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [message.conversation_id]: [...existing, message],
      },
    });
    // A brand-new message that directly continues from whatever this
    // client currently has as its active leaf should advance that pointer
    // — otherwise, once a device has sent even one message of its own
    // (pinning activeLeaf to it), a *newer* message from someone else in
    // the same conversation (a Live Room co-participant, or another of the
    // user's own devices) never becomes visible here: pathToLeaf just keeps
    // walking the same old, now-stale leaf. A leaf still unset (this
    // device has never sent anything) already free-follows the tip via
    // defaultLeaf, so this only needs to handle the pinned case. Messages
    // that don't extend the current leaf (an edit's sibling branch, or a
    // reply arriving before its own parent has synced yet) are left alone.
    const currentLeaf = get().activeLeafByConversation[message.conversation_id];
    if (currentLeaf && message.parent_message_id === currentLeaf) {
      get().setActiveLeaf(message.conversation_id, message.id);
    }
  },

  applyRemoteConversation: (conversation) => {
    set({
      conversations: get().conversations.map((c) => (c.id === conversation.id ? conversation : c)),
    });
  },

  clearStaleGenerationLock: async (conversation) => {
    if (!conversation.is_generating) return;
    const staleSince = Date.now() - new Date(conversation.updated_at).getTime();
    if (staleSince < STALE_GENERATION_TIMEOUT_MS) return;
    const { data, error } = await supabase
      .from('conversations')
      .update({ is_generating: false })
      .eq('id', conversation.id)
      .eq('is_generating', true) // still-atomic — a legitimately-finishing generation wins the race
      .select()
      .single();
    if (!error && data) get().applyRemoteConversation(data);
  },

  setActiveLeaf: (conversationId, leafId) => {
    set({
      activeLeafByConversation: { ...get().activeLeafByConversation, [conversationId]: leafId },
    });
  },

  sendMessage: async (conversationId, content, parentMessageId = null, sender = null) => {
    // Claim the generation lock. If this fails to apply because another
    // device already flipped it, Realtime will inform us and the UI should
    // already be disabling input via the is_generating conversation state.
    const { data: lockRow, error: lockError } = await supabase
      .from('conversations')
      .update({ is_generating: true })
      .eq('id', conversationId)
      .eq('is_generating', false)
      .select()
      .single();
    if (lockError || !lockRow) {
      throw new Error('Another device is already generating a response for this conversation.');
    }

    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content,
        parent_message_id: parentMessageId,
        sender_name: sender?.name ?? null,
        sender_color: sender?.color ?? null,
      })
      .select()
      .single();
    if (userMsgError) {
      await supabase.from('conversations').update({ is_generating: false }).eq('id', conversationId);
      throw userMsgError;
    }
    get().applyRemoteMessage(userMessage);
    get().setActiveLeaf(conversationId, userMessage.id);

    // First message in a fresh conversation — title it from what was
    // actually said instead of leaving the generic placeholder, like
    // ChatGPT's auto-named threads.
    if (!parentMessageId) {
      const current = get().conversations.find((c) => c.id === conversationId);
      if (current && (current.title === DRAFT_CONVERSATION_TITLE || current.title === TEMPORARY_CONVERSATION_TITLE)) {
        void get().renameConversation(conversationId, titleFromMessage(content));
      }
    }

    // History follows the parent chain only, so a branch never leaks
    // context from a sibling branch into the model call. Capped to the most
    // recent MAX_HISTORY_TURNS — without this, a long-running conversation
    // sends its *entire* history on every single turn, growing cost and
    // latency without bound and eventually overflowing the provider's
    // context window outright (a hard failure with no graceful
    // degradation, since none of the three providers truncate for us).
    const ancestryMessages = get().messagesByConversation[conversationId] ?? [];
    const fullPath = pathToLeaf(ancestryMessages, userMessage.id);
    const truncatedPath = fullPath.length > MAX_HISTORY_TURNS ? fullPath.slice(-MAX_HISTORY_TURNS) : fullPath;
    const history: { role: 'user' | 'assistant' | 'system'; content: string }[] = truncatedPath.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Always available, zero-cost grounding (no network call — just the
    // device clock), so "what time is it in Tokyo" gets a real answer
    // instead of a deflection, independent of the web-search heuristics
    // below.
    history.unshift({ role: 'system', content: currentDateTimeContext() });

    // Response length / tone / deep-think are global user preferences (see
    // Settings), not per-call params — read directly here rather than
    // threading them through every sendMessage call site (editAndBranch,
    // Live Room sends, etc).
    const { responseLength, tone, deepThinkEnabled } = useSettingsStore.getState();
    history.unshift({
      role: 'system',
      content: buildResponseStyleInstruction({ length: responseLength, tone, deepThink: deepThinkEnabled }),
    });

    // Insert the assistant row before any slow prep work (especially web
    // search) so the user sees progress immediately instead of a blank gap.
    const { data: placeholder, error: placeholderError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: '<think>Reading your message and setting up the answer...',
        parent_message_id: userMessage.id,
      })
      .select()
      .single();
    if (placeholderError) {
      await supabase.from('conversations').update({ is_generating: false }).eq('id', conversationId);
      throw placeholderError;
    }
    get().applyRemoteMessage(placeholder);
    get().setActiveLeaf(conversationId, placeholder.id);

    const updateAssistantProgress = (step: string) => {
      const content = `<think>${step}`;
      get().applyRemoteMessage({ ...placeholder, content });
      void supabase.from('messages').update({ content }).eq('id', placeholder.id);
    };

    updateAssistantProgress('Understanding your request and checking the conversation context...');

    // Prior user turns in this conversation (oldest first, current message
    // excluded) — lets a short follow-up like "and tomorrow?" inherit a
    // live-data need from what was just being discussed, and lets the
    // actual search query get resolved against that context instead of
    // searching for "tomorrow?" in isolation. See shouldSearchWeb/
    // buildSearchQuery in lib/webSearch.ts.
    // history's last entry is always the message just sent (path-to-leaf
    // ends at userMessage.id) — slice it off rather than filtering by
    // content equality, which could misfire if an earlier turn happened to
    // repeat the same text.
    const priorUserMessages = history
      .slice(0, -1)
      .filter((m) => m.role === 'user')
      .map((m) => m.content);

    // Automatic live-data grounding: only fires for questions that read as
    // needing current info ("today", "latest price", etc.) — see
    // shouldSearchWeb's heuristics — and only if a Tavily key is configured.
    // Failures here are non-fatal: the model still answers from its own
    // knowledge, just without fresh context, rather than blocking the send.
    if (shouldSearchWeb(content, priorUserMessages)) {
      try {
        const searchQuery = buildSearchQuery(content, priorUserMessages);
        updateAssistantProgress(`Searching the web for: "${searchQuery}"`);
        const outcome = await searchWeb(searchQuery);
        const sourceCount = outcome.results.length;
        updateAssistantProgress(
          `Found ${sourceCount} web source${sourceCount === 1 ? '' : 's'} and folding the useful parts into the answer...`
        );
        history.unshift({ role: 'system', content: formatSearchContext(searchQuery, outcome) });
      } catch {
        updateAssistantProgress('Web search did not return usable results, so I am answering from the available context...');
        // Search is best-effort — proceed without it.
      }
    }

    updateAssistantProgress('Starting the AI stream and drafting the response...');

    let buffer = '';
    let lastFlush = Date.now();
    let finalAssistantMessage: Message;

    try {
      const result = await streamChatCompletion(history, {
        onProviderStart: (provider) => set({ activeProvider: provider }),
        onToken: (delta) => {
          buffer += delta;
          // Update this device's own UI instantly on every token — previously
          // only the throttled DB write below happened here, so the sender's
          // own screen only grew when Supabase's postgres_changes UPDATE
          // round-tripped back roughly every 100ms+network latency, making
          // typing feel laggy even though tokens were arriving faster than
          // that. Other devices still sync via the DB write (their own
          // postgres_changes subscription), so this only affects local feel.
          get().applyRemoteMessage({ ...placeholder, content: buffer });
          // Throttle DB writes to ~10/sec instead of on every token.
          if (Date.now() - lastFlush > 100) {
            lastFlush = Date.now();
            void supabase.from('messages').update({ content: buffer }).eq('id', placeholder.id);
          }
        },
      });

      await supabase
        .from('messages')
        .update({ content: result.content, model_used: result.provider })
        .eq('id', placeholder.id);
      await supabase
        .from('conversations')
        .update({ is_generating: false, active_model: result.provider })
        .eq('id', conversationId);
      finalAssistantMessage = { ...placeholder, content: result.content, model_used: result.provider };
    } catch (err) {
      captureException(err, { scope: 'sendMessage', conversationId });
      const failureContent = '⚠️ All AI providers failed to respond. Please try again.';
      await supabase.from('messages').update({ content: failureContent }).eq('id', placeholder.id);
      await supabase.from('conversations').update({ is_generating: false }).eq('id', conversationId);
      get().applyRemoteMessage({ ...placeholder, content: failureContent });
      throw err;
    } finally {
      set({ activeProvider: null });
    }

    // Applied directly rather than waiting for this same client's own
    // postgres_changes UPDATE to round-trip back — that event can lag
    // enough that a caller reading local state right after this promise
    // resolves (e.g. to broadcast the finished reply to a Live Room) would
    // still see the empty placeholder. We already have the true final
    // content in hand here, so there's no reason to wait for it to echo
    // back over the network.
    get().applyRemoteMessage(finalAssistantMessage);

    return { userMessage, assistantMessage: finalAssistantMessage };
  },

  editAndBranch: async (conversationId, messageId, newContent) => {
    const messages = get().messagesByConversation[conversationId] ?? [];
    const original = messages.find((m) => m.id === messageId);
    if (!original) throw new Error('Message not found');
    await get().sendMessage(conversationId, newContent, original.parent_message_id);
  },
}));
