-- Fixes a critical bug in 0005_rooms.sql: "room_participants_select_room_member"
-- queried public.room_participants from within its own policy, which
-- Postgres correctly rejects as infinite recursion (error 42P17) — and
-- because conversations/messages' room-guest policies join through
-- room_participants, this broke ALL conversation/message reads for EVERY
-- user, not just room guests. Run this immediately if you've already run
-- 0005_rooms.sql.
--
-- Fix: move the membership check into a SECURITY DEFINER function. Postgres
-- table owners bypass their own table's RLS by default, so a function
-- owned by the default (postgres) role can query room_participants without
-- re-triggering this same policy.

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.room_participants
    where room_id = target_room_id and user_id = auth.uid()
  );
$$;

drop policy if exists "room_participants_select_room_member" on public.room_participants;
create policy "room_participants_select_room_member" on public.room_participants
  for select using (
    public.is_room_member(room_participants.room_id)
    or auth.uid() = (select host_user_id from public.rooms where id = room_participants.room_id)
  );
