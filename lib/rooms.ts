import { supabase } from './supabase';
import type { Room, RoomParticipant } from '../types/db';

const ROOM_TTL_HOURS = 24;

// A fixed, high-contrast palette so two participants never end up with
// visually identical colors in a small room — assigned deterministically by
// join order rather than randomly.
export const ROOM_PARTICIPANT_COLORS = [
  '#FF5A36', // Ember
  '#FF2D78', // Nova
  '#2FB5C9',
  '#9B6EF3',
  '#3FB56B',
  '#F2B33D',
] as const;

export function colorForIndex(index: number): string {
  return ROOM_PARTICIPANT_COLORS[index % ROOM_PARTICIPANT_COLORS.length];
}

export function isRoomActive(room: Pick<Room, 'ended_at' | 'expires_at'>): boolean {
  return !room.ended_at && new Date(room.expires_at).getTime() > Date.now();
}

/** Finds an existing active room for this conversation, or creates one. Only the host may call this. */
export async function getOrCreateActiveRoom(conversationId: string, hostUserId: string): Promise<Room> {
  const { data: existing, error: findError } = await supabase
    .from('rooms')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('ended_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const expiresAt = new Date(Date.now() + ROOM_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('rooms')
    .insert({ conversation_id: conversationId, host_user_id: hostUserId, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function endRoom(roomId: string): Promise<void> {
  const { error } = await supabase.from('rooms').update({ ended_at: new Date().toISOString() }).eq('id', roomId);
  if (error) throw error;
}

export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
  const { data, error } = await supabase
    .from('room_participants')
    .select('*')
    .eq('room_id', roomId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Joins a room as the currently-authenticated user (host, logged-in guest,
 * or a freshly anonymous-signed-in guest — the caller decides which).
 * Assigns the next unused color by join order.
 */
export async function joinRoom(roomId: string, userId: string, displayName: string): Promise<RoomParticipant> {
  const existingParticipants = await getRoomParticipants(roomId);
  const alreadyIn = existingParticipants.find((p) => p.user_id === userId);
  const color = alreadyIn?.color ?? colorForIndex(existingParticipants.length);

  // Goes through a SECURITY DEFINER RPC rather than a direct table upsert —
  // see 0007_room_join_rpc.sql for why: the plain client-side insert was
  // rejected by RLS in a way that couldn't be reproduced at the SQL level.
  const { data, error } = await supabase.rpc('join_room', {
    target_room_id: roomId,
    guest_display_name: displayName,
    guest_color: color,
  });
  if (error) throw error;
  return data;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('room_participants')
    .update({ left_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);
  if (error) throw error;
}

// Callers already skip this entirely when a session already exists (see
// app/room/[roomId].tsx), so a normal repeat visitor reusing their
// persisted anonymous session never hits this path twice. This cooldown is
// a soft speed bump against accidental rapid-fire calls (a fast double-tap,
// a broken retry loop) from *this* client only — it cannot stop a
// determined attacker calling signInAnonymously() directly against the API,
// bypassing the app entirely. The actual, authoritative rate limit for
// anonymous sign-ins lives in Supabase Dashboard -> Authentication -> Rate
// Limits, which must be configured there; it can't be set from client code.
const GUEST_SIGNIN_COOLDOWN_MS = 3000;
let lastGuestSignInAt = 0;

/** Signs the visitor in anonymously (no email/password) so RLS has a real auth.uid() to key off. */
export async function signInAsGuest(): Promise<string> {
  const now = Date.now();
  if (now - lastGuestSignInAt < GUEST_SIGNIN_COOLDOWN_MS) {
    throw new Error('Please wait a moment before trying to join again.');
  }
  lastGuestSignInAt = now;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('Could not create a guest session.');
  // signInAnonymously() can resolve a beat before the client has fully
  // persisted the new session for use as the Authorization header on the
  // very next request — observed as the immediately-following
  // room_participants insert getting rejected by RLS (42501) because
  // auth.uid() still evaluated against the old (anonymous/no) session.
  // Waiting on getSession() forces the client to settle first.
  await supabase.auth.getSession();
  return data.user.id;
}

export function roomShareUrl(roomId: string): string {
  const base =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'https://nexuschat.app'; // native share sheets still get a usable absolute URL
  return `${base}/room/${roomId}`;
}
