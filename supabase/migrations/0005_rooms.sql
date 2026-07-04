-- Live Collaborative AI Room
-- Run via: supabase db push  (or paste into the Supabase SQL editor)
--
-- Requires "Anonymous sign-ins" enabled in Authentication settings — guests
-- join via supabase.auth.signInAnonymously() so RLS can key off a real
-- auth.uid() without a full signup.

-- ─────────────────────────────────────────────────────────────────────────
-- rooms
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  ended_at timestamptz
);

create index if not exists rooms_conversation_id_idx on public.rooms (conversation_id);

alter table public.rooms enable row level security;

-- The room id (a UUID) *is* the shareable link's unguessable token, so
-- anyone holding it can check whether it's still valid before joining. This
-- only exposes ids/timestamps — never conversation content.
create policy "rooms_select_anyone" on public.rooms
  for select using (true);

create policy "rooms_insert_host" on public.rooms
  for insert with check (auth.uid() = host_user_id);

create policy "rooms_update_host" on public.rooms
  for update using (auth.uid() = host_user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- room_participants
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  color text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id)
);

create index if not exists room_participants_room_id_idx on public.room_participants (room_id);

alter table public.room_participants enable row level security;

-- Any current member of the room (or its host) can see the full roster —
-- needed to render everyone's avatar bubble, not just your own.
create policy "room_participants_select_room_member" on public.room_participants
  for select using (
    exists (
      select 1 from public.room_participants me
      where me.room_id = room_participants.room_id and me.user_id = auth.uid()
    )
    or auth.uid() = (select host_user_id from public.rooms where id = room_participants.room_id)
  );

create policy "room_participants_insert_self" on public.room_participants
  for insert with check (auth.uid() = user_id);

create policy "room_participants_update_self" on public.room_participants
  for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- extend conversations/messages RLS: an active room participant can read
-- and post in the shared conversation without owning it. These are
-- additive policies alongside the existing owner-only ones (Postgres OR's
-- multiple permissive policies for the same command).
-- ─────────────────────────────────────────────────────────────────────────
create policy "conversations_select_room_guest" on public.conversations
  for select using (
    exists (
      select 1 from public.rooms r
      join public.room_participants rp on rp.room_id = r.id
      where r.conversation_id = conversations.id
        and rp.user_id = auth.uid()
        and rp.left_at is null
        and r.ended_at is null
        and r.expires_at > now()
    )
  );

-- Guests need to flip `is_generating`/`active_model` to send a message (see
-- sendMessage's generation-lock dance). This is intentionally not
-- column-restricted — Postgres RLS can't express "only these columns" in a
-- row policy without a trigger — so it's a known simplification: the app UI
-- simply never exposes rename/pin/delete controls to guests.
create policy "conversations_update_room_guest" on public.conversations
  for update using (
    exists (
      select 1 from public.rooms r
      join public.room_participants rp on rp.room_id = r.id
      where r.conversation_id = conversations.id
        and rp.user_id = auth.uid()
        and rp.left_at is null
        and r.ended_at is null
        and r.expires_at > now()
    )
  );

create policy "messages_select_room_guest" on public.messages
  for select using (
    exists (
      select 1 from public.rooms r
      join public.room_participants rp on rp.room_id = r.id
      where r.conversation_id = messages.conversation_id
        and rp.user_id = auth.uid()
        and rp.left_at is null
        and r.ended_at is null
        and r.expires_at > now()
    )
  );

create policy "messages_insert_room_guest" on public.messages
  for insert with check (
    exists (
      select 1 from public.rooms r
      join public.room_participants rp on rp.room_id = r.id
      where r.conversation_id = messages.conversation_id
        and rp.user_id = auth.uid()
        and rp.left_at is null
        and r.ended_at is null
        and r.expires_at > now()
    )
  );

-- Attribution for room-sent messages, so the bubble can show who wrote it.
-- Null for ordinary solo messages.
alter table public.messages add column if not exists sender_name text;
alter table public.messages add column if not exists sender_color text;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_participants;
