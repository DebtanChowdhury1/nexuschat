-- Pre-release review flagged three frequently-queried/sorted columns with
-- no index: messages(created_at) (sort order for loadMessages),
-- conversations(updated_at) (sidebar sort order), and
-- room_participants(user_id) (roster lookups when a user is in multiple
-- rooms). Invisible at current scale, but each becomes a real latency cost
-- as conversation/message counts grow.

create index if not exists messages_created_at_idx on public.messages (created_at);
create index if not exists conversations_updated_at_idx on public.conversations (updated_at);
create index if not exists room_participants_user_id_idx on public.room_participants (user_id);
