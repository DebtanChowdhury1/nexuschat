-- Fixes a gap in 0005_rooms.sql: room guests got SELECT and INSERT policies
-- on messages, but no UPDATE policy. Since sendMessage() streams the AI
-- reply by inserting an empty assistant placeholder and then UPDATEing it
-- with the final content, a guest-sent message's AI reply silently never
-- saves its content — the UPDATE matches zero rows under RLS and
-- PostgREST returns 204 (success) regardless, masking the failure
-- entirely. Confirmed by inspecting the row directly: content stayed ''.

create policy "messages_update_room_guest" on public.messages
  for update using (
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
