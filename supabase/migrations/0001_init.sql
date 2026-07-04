-- NexusChat initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- conversations
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  is_generating boolean not null default false,
  active_model text check (active_model in ('groq', 'gemini', 'openrouter')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations (user_id);

alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = user_id);

create policy "conversations_insert_own" on public.conversations
  for insert with check (auth.uid() = user_id);

create policy "conversations_update_own" on public.conversations
  for update using (auth.uid() = user_id);

create policy "conversations_delete_own" on public.conversations
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- messages
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model_used text check (model_used in ('groq', 'gemini', 'openrouter')),
  parent_message_id uuid references public.messages (id) on delete set null,
  branch_root_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_parent_message_id_idx on public.messages (parent_message_id);

alter table public.messages enable row level security;

-- messages are scoped through their parent conversation's ownership
create policy "messages_select_own" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages_insert_own" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages_update_own" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages_delete_own" on public.messages
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- typing_status (Mirror Mode cross-device typing indicators)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.typing_status (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  device_id text not null,
  device_label text not null default 'Device',
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, device_id)
);

alter table public.typing_status enable row level security;

create policy "typing_status_select_own" on public.typing_status
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = typing_status.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "typing_status_upsert_own" on public.typing_status
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = typing_status.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "typing_status_update_own" on public.typing_status
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = typing_status.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "typing_status_delete_own" on public.typing_status
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = typing_status.conversation_id and c.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- housekeeping: keep conversations.updated_at fresh, enable Realtime
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.touch_conversation_updated_at()
returns trigger as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_updated_at();

-- Add tables to the supabase_realtime publication so postgres_changes works
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.typing_status;
