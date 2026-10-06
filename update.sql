-- TRCF Youth Jam update: run once in Supabase > SQL Editor > New query > Run
do $$ declare t text; begin
foreach t in array array['events','lifegroups','news','settings'] loop
  execute format('create table if not exists %I (id text primary key, data jsonb not null, created_at timestamptz default now())', t);
  execute format('alter table %I enable row level security', t);
  execute format('create policy "admin all" on %I for all to authenticated using (true) with check (true)', t);
  execute format('create policy "public read" on %I for select to anon using (true)', t);
end loop; end $$;
alter publication supabase_realtime add table events, lifegroups, news, settings;
