-- VELFONT OFFICE — main-site scroll gallery
-- Run once in the Supabase SQL Editor (same project as contact_table.sql
-- and journal_table.sql). Replaces the old standalone Archive section:
-- full-bleed photos that fade in as the main page scrolls past them,
-- between Office and About — see js/archive-gallery.js.
--
-- Read-only from the browser (anon key can only SELECT) — there's no
-- upload UI on the site itself by design. Add/remove photos directly in
-- the Supabase dashboard:
--   1. Storage -> "archive" bucket -> upload an image.
--   2. Table Editor -> archive_photos -> insert a row with that file's
--      path as `image` (e.g. "coat-1.jpg"), an optional `caption`, and
--      `sort_order` to control where it falls in the sequence.
-- An empty table is expected on a fresh run — the gallery section just
-- stays empty until rows exist, same as shop's archive_blocks.

create table if not exists archive_photos (
  id uuid primary key default gen_random_uuid(),
  image text not null,       -- storage path within the "archive" bucket, or a full URL
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table archive_photos enable row level security;

create policy "Allow public read"
  on archive_photos
  for select
  to anon
  using (true);

insert into storage.buckets (id, name, public)
values ('archive', 'archive', true)
on conflict (id) do nothing;

create policy "Public read access to archive photos bucket"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'archive');
