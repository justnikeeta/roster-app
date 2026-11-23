create table if not exists pods (id text primary key, lead text);
create table if not exists employees (id text primary key, name text not null, pod text, pref_off int default 0);
create table if not exists processes (id text primary key, brand text not null, name text not null, cal text not null, min_staff int not null default 1);
create table if not exists assignments (emp text, proc text, primary key (emp, proc));
create table if not exists leaves (emp text, date text, primary key (emp, date));
create table if not exists holidays (date text primary key);
-- Demo mode: open access with no login. A production version would add auth and per-role policies.
do $$ declare t text; begin
  foreach t in array array['pods','employees','processes','assignments','leaves','holidays'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "demo access" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
-- Newer Supabase projects don't grant API roles access to new tables automatically.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;