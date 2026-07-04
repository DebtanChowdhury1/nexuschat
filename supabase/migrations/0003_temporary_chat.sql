-- Temporary chat support (ChatGPT-style): flagged conversations are hidden
-- from the sidebar and deleted client-side once the user navigates away.
-- Run via: supabase db push (or paste into the Supabase SQL editor)

alter table public.conversations
  add column if not exists is_temporary boolean not null default false;
