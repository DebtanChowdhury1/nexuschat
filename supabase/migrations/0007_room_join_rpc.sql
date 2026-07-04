-- Works around an unexplained RLS failure: the plain client-side INSERT into
-- room_participants was rejected by PostgREST with "new row violates
-- row-level security policy" (42501) even though every SQL-level diagnostic
-- confirmed the policy, its role scope, and auth.uid() resolution were all
-- correct — the same insert succeeded when manually impersonated in the SQL
-- editor. Rather than continue chasing a connection-pooler/PostgREST-level
-- discrepancy blind, this moves the join into a SECURITY DEFINER function
-- that authoritatively uses auth.uid() itself (never trusting a
-- client-supplied user_id) and bypasses the table's RLS entirely via
-- ownership, the same mechanism already used by is_room_member().

create or replace function public.join_room(target_room_id uuid, guest_display_name text, guest_color text)
returns public.room_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.room_participants;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Must be signed in (even anonymously) to join a room.';
  end if;

  if not exists (
    select 1 from public.rooms
    where id = target_room_id and ended_at is null and expires_at > now()
  ) then
    raise exception 'This room is no longer active.';
  end if;

  insert into public.room_participants (room_id, user_id, display_name, color, left_at)
  values (target_room_id, current_user_id, guest_display_name, guest_color, null)
  on conflict (room_id, user_id)
  do update set display_name = excluded.display_name, left_at = null
  returning * into result;

  return result;
end;
$$;

grant execute on function public.join_room(uuid, text, text) to authenticated, anon;
