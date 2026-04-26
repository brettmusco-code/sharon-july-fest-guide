-- Public photo uploads go to Supabase Storage (replaces Google Drive uploader).
-- Path convention: {year}/{uuid}_{filename} in bucket "festival-photos".

-- Bucket: public read so getPublicUrl() works; uploads only from Edge (service role).
insert into storage.buckets (id, name, public, file_size_limit)
values (
  'festival-photos',
  'festival-photos',
  true,
  15728640 -- 15 MB (matches app + Edge Function)
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- RLS: anyone can read objects in this bucket (view shared URLs in browser / app).
create policy "Public can read festival photos"
on storage.objects
for select
to public
using (bucket_id = 'festival-photos');

-- RLS: admins can remove files when they delete a submission in the admin UI.
create policy "Admins can delete festival photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'festival-photos'
  and public.has_role(auth.uid(), 'admin')
);

-- Public app no longer needs Google Drive folder id; only fireworks time is public.
drop policy if exists "Anyone can view public app config keys" on public.app_config;

create policy "Anyone can view public app config keys"
on public.app_config
for select
to public
using (key = 'fireworks_at');
