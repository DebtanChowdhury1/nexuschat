-- Avatar storage for the Profile page.
-- Run via: supabase db push (or paste into the Supabase SQL editor)

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Files are stored as "<user_id>/<filename>" — policies key off that first
-- path segment so users can only write inside their own folder. Public
-- read is fine since avatars are meant to be publicly viewable images.
create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
