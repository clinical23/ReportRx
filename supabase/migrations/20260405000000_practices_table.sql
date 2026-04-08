-- ReportRx: ensure public.practices exists BEFORE 20260406120000_profiles_auth.sql
-- (profiles.practice_id references public.practices). Safe to re-run.

create extension if not exists "uuid-ossp";

create table if not exists public.practices (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  pcn_name text null
);

create index if not exists practices_name_idx on public.practices (name);

alter table public.practices enable row level security;

drop policy if exists "practices_select_anon" on public.practices;
create policy "practices_select_anon"
  on public.practices for select using (true);

drop policy if exists "practices_insert_anon" on public.practices;
create policy "practices_insert_anon"
  on public.practices for insert with check (true);

drop policy if exists "practices_update_anon" on public.practices;
create policy "practices_update_anon"
  on public.practices for update using (true) with check (true);

drop policy if exists "practices_delete_anon" on public.practices;
create policy "practices_delete_anon"
  on public.practices for delete using (true);
