import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { getDeviceId, getDeviceLabel } from './deviceId';
import type { Conversation, Message, Room } from '../types/db';

/**
 * Subscribes to INSERT/UPDATE on messages for one conversation. This is what
 * makes a message sent from another device (or the same device's own
 * optimistic write landing) appear live without a manual refetch.
 */
export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: Message) => void,
  onUpdate: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as Message)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribes to the conversation row itself, primarily to observe the
 * `is_generating` flag flipping — this is the concurrency guardrail that
 * disables input on every other device while one device's AI call is
 * in-flight.
 */
export function subscribeToConversation(
  conversationId: string,
  onUpdate: (conversation: Conversation) => void
): RealtimeChannel {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as Conversation)
    )
    .subscribe();
}

/**
 * Watches every conversation row owned by this user — INSERT (a new chat
 * started on another device), UPDATE (rename, pin, is_generating flip,
 * title auto-set from the first message), and DELETE. This is what makes
 * the dashboard/sidebar/chat list stay in sync across devices (e.g. web and
 * mobile) without a manual reload, the same way an open conversation's own
 * messages already do via subscribeToMessages.
 */
export function subscribeToUserConversations(userId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();
}

/** Watches a room row so connected guests are kicked out live the moment the host ends it. */
export function subscribeToRoom(roomId: string, onUpdate: (room: Room) => void): RealtimeChannel {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onUpdate(payload.new as Room)
    )
    .subscribe();
}

/**
 * Room messages take a second path alongside subscribeToMessages'
 * postgres_changes: broadcasting the finished user+assistant messages to
 * everyone in the room the moment a send completes. This isn't redundant —
 * testing two real, separate guest sessions against the live project
 * showed a room guest's postgres_changes subscription reliably misses
 * INSERT/UPDATE events for rows written by *other* participants (the
 * multi-table EXISTS-join RLS policy in messages_select_room_guest
 * evaluates fine for a plain SELECT/refetch, but Realtime's per-event
 * authorization for postgres_changes doesn't reliably re-check it) — a
 * manual refresh always showed the message, live delivery never did.
 * Broadcast doesn't depend on that RLS path at all, so it isn't affected.
 * applyRemoteMessage already dedupes by id, so it's safe to also keep the
 * postgres_changes subscription active alongside this.
 */
export function subscribeToRoomMessages(roomId: string, onMessage: (message: Message) => void): RealtimeChannel {
  const channel = supabase.channel(`room-messages:${roomId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on('broadcast', { event: 'message' }, ({ payload }) => onMessage(payload as Message))
    .subscribe();
  return channel;
}

export async function broadcastRoomMessage(channel: RealtimeChannel, message: Message): Promise<void> {
  await channel.send({ type: 'broadcast', event: 'message', payload: message });
}

export interface TypingBroadcastPayload {
  deviceId: string;
  deviceLabel: string;
  isTyping: boolean;
  /** Present when the typist is inside a Live Room — used instead of deviceLabel there. */
  participantName?: string;
  participantColor?: string;
}

/**
 * Mirror Mode: a broadcast channel (not a DB table read) so "typing on
 * Web…" indicators are near-instant and don't require a round trip through
 * Postgres. The `typing_status` table still backs this for late joiners.
 */
export function subscribeToTyping(
  conversationId: string,
  onTyping: (payload: TypingBroadcastPayload) => void
): RealtimeChannel {
  const channel = supabase.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on('broadcast', { event: 'typing' }, ({ payload }) => onTyping(payload as TypingBroadcastPayload))
    .subscribe();
  return channel;
}

export async function broadcastTyping(
  channel: RealtimeChannel,
  conversationId: string,
  isTyping: boolean,
  participant?: { name: string; color: string }
): Promise<void> {
  const [deviceId, deviceLabel] = [await getDeviceId(), getDeviceLabel()];
  await channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      deviceId,
      deviceLabel,
      isTyping,
      participantName: participant?.name,
      participantColor: participant?.color,
    } satisfies TypingBroadcastPayload,
  });
  // Best-effort persistence so a device joining mid-typing-burst still sees
  // state. Skipped for room guests — typing_status is scoped to
  // conversation owners only, and the broadcast above is what actually
  // drives the indicator for everyone in the room.
  if (!participant) {
    await supabase.from('typing_status').upsert({
      conversation_id: conversationId,
      device_id: deviceId,
      device_label: deviceLabel,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    });
  }
}

export interface RoomPresenceState {
  userId: string;
  displayName: string;
  color: string;
}

/**
 * Supabase Realtime Presence for "who's currently in this room" — no table
 * needed, the channel itself tracks join/leave/sync. Drives the animated
 * avatar bubbles in the chat header.
 */
export function subscribeToRoomPresence(
  roomId: string,
  self: RoomPresenceState,
  onChange: (participants: RoomPresenceState[]) => void
): RealtimeChannel {
  const channel = supabase.channel(`room-presence:${roomId}`, {
    config: { presence: { key: self.userId } },
  });

  const emit = () => {
    const state = channel.presenceState<RoomPresenceState>();
    // presenceState() groups by presence key, but each key can carry more
    // than one entry (e.g. the same user connected from two tabs) — dedupe
    // by userId so the UI only ever shows one bubble per person.
    const byUserId = new Map<string, RoomPresenceState>();
    for (const p of Object.values(state).flat()) {
      byUserId.set(p.userId, { userId: p.userId, displayName: p.displayName, color: p.color });
    }
    onChange(Array.from(byUserId.values()));
  };

  channel
    .on('presence', { event: 'sync' }, emit)
    .on('presence', { event: 'join' }, emit)
    .on('presence', { event: 'leave' }, emit)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track(self);
    });

  return channel;
}

export function unsubscribe(channel: RealtimeChannel | null | undefined): void {
  if (channel) supabase.removeChannel(channel);
}
