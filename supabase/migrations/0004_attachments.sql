-- File attachments for chat messages.
-- Run via: supabase db push (or paste into the Supabase SQL editor)

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Same folder-scoped ownership pattern as avatars: "<user_id>/<filename>".
create policy "attachment_public_read" on storage.objects
  for select using (bucket_id = 'attachments');

create policy "attachment_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachment_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );
