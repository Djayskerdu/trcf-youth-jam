-- TRCF Youth Jam: run once in Supabase > SQL Editor > New query > Run
do $$ declare t text; begin
foreach t in array array['media','testimonies','youth','registrations','messages'] loop
  execute format('create table if not exists %I (id text primary key, data jsonb not null, created_at timestamptz default now())', t);
  execute format('alter table %I enable row level security', t);
  -- any signed-in user = admin: full access
  execute format('create policy "admin all" on %I for all to authenticated using (true) with check (true)', t);
end loop; end $$;
-- public website visitors can read these
create policy "public read" on media for select to anon using (true);
create policy "public read" on testimonies for select to anon using (true);
-- public visitors can submit (but never read) registrations and messages
create policy "public insert" on registrations for insert to anon with check (true);
create policy "public insert" on messages for insert to anon with check (true);
-- photo & video storage
insert into storage.buckets (id, name, public) values ('media','media',true) on conflict do nothing;
create policy "public read files" on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy "admin upload files" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "admin delete files" on storage.objects for delete to authenticated using (bucket_id = 'media');
-- live updates
alter publication supabase_realtime add table media, testimonies, youth, registrations, messages;
