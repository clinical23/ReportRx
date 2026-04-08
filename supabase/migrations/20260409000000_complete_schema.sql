-- ReportRx: tables + view expected by database.types.ts, activity.ts, data.ts, and
-- app/actions/activity.ts (upsert on clinician_id, practice_id, log_date).
-- Uses IF NOT EXISTS / OR REPLACE where possible. Safe to run on DBs that already
-- have some objects from a remote project.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- practices (also created in 20260405000000; idempotent)
-- ---------------------------------------------------------------------------
create table if not exists public.practices (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  pcn_name text null
);

create index if not exists practices_name_idx on public.practices (name);

-- ---------------------------------------------------------------------------
-- pcns
-- ---------------------------------------------------------------------------
create table if not exists public.pcns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists pcns_name_idx on public.pcns (name);

-- ---------------------------------------------------------------------------
-- activity_categories
-- ---------------------------------------------------------------------------
create table if not exists public.activity_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create unique index if not exists activity_categories_name_uniq
  on public.activity_categories (name);

create index if not exists activity_categories_sort_idx
  on public.activity_categories (sort_order);

-- ---------------------------------------------------------------------------
-- activity_logs (log_date matches app: date-only strings YYYY-MM-DD)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  clinician_id uuid not null references public.clinicians (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  log_date date not null,
  hours_worked numeric,
  notes text null,
  created_at timestamptz not null default now()
);

create unique index if not exists activity_logs_clinician_practice_log_date_uniq
  on public.activity_logs (clinician_id, practice_id, log_date);

create index if not exists activity_logs_log_date_idx
  on public.activity_logs (log_date);

create index if not exists activity_logs_clinician_id_idx
  on public.activity_logs (clinician_id);

create index if not exists activity_logs_practice_id_idx
  on public.activity_logs (practice_id);

-- ---------------------------------------------------------------------------
-- activity_log_entries
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log_entries (
  id uuid primary key default uuid_generate_v4(),
  log_id uuid not null references public.activity_logs (id) on delete cascade,
  category_id uuid not null references public.activity_categories (id) on delete restrict,
  count integer not null default 0 check (count >= 0)
);

create index if not exists activity_log_entries_log_id_idx
  on public.activity_log_entries (log_id);

create index if not exists activity_log_entries_category_id_idx
  on public.activity_log_entries (category_id);

-- ---------------------------------------------------------------------------
-- clinician_pcns (junction; pairs with public.pcns)
-- ---------------------------------------------------------------------------
create table if not exists public.clinician_pcns (
  clinician_id uuid not null references public.clinicians (id) on delete cascade,
  pcn_id uuid not null references public.pcns (id) on delete cascade,
  primary key (clinician_id, pcn_id)
);

create index if not exists clinician_pcns_pcn_id_idx
  on public.clinician_pcns (pcn_id);

-- ---------------------------------------------------------------------------
-- activity_report view (columns align with database.types Views.activity_report.Row)
-- ---------------------------------------------------------------------------
create or replace view public.activity_report as
select
  l.id::text as log_id,
  l.log_date::text as log_date,
  l.hours_worked,
  coalesce(c.name, '') as clinician_name,
  coalesce(p.name, '') as practice_name,
  coalesce(ac.name, '') as category_name,
  e.count::integer as appointment_count
from public.activity_log_entries e
join public.activity_logs l on l.id = e.log_id
join public.clinicians c on c.id = l.clinician_id
join public.practices p on p.id = l.practice_id
join public.activity_categories ac on ac.id = e.category_id;

-- ---------------------------------------------------------------------------
-- RLS (mirror permissive anon pattern from existing migrations)
-- ---------------------------------------------------------------------------
alter table public.pcns enable row level security;
alter table public.activity_categories enable row level security;
alter table public.activity_logs enable row level security;
alter table public.activity_log_entries enable row level security;
alter table public.clinician_pcns enable row level security;
alter table public.practices enable row level security;

-- practices policies (idempotent with 20260405000000)
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

drop policy if exists "pcns_select_anon" on public.pcns;
create policy "pcns_select_anon" on public.pcns for select using (true);
drop policy if exists "pcns_insert_anon" on public.pcns;
create policy "pcns_insert_anon" on public.pcns for insert with check (true);
drop policy if exists "pcns_update_anon" on public.pcns;
create policy "pcns_update_anon" on public.pcns for update using (true) with check (true);
drop policy if exists "pcns_delete_anon" on public.pcns;
create policy "pcns_delete_anon" on public.pcns for delete using (true);

drop policy if exists "clinician_pcns_select_anon" on public.clinician_pcns;
create policy "clinician_pcns_select_anon"
  on public.clinician_pcns for select using (true);
drop policy if exists "clinician_pcns_insert_anon" on public.clinician_pcns;
create policy "clinician_pcns_insert_anon"
  on public.clinician_pcns for insert with check (true);
drop policy if exists "clinician_pcns_update_anon" on public.clinician_pcns;
create policy "clinician_pcns_update_anon"
  on public.clinician_pcns for update using (true) with check (true);
drop policy if exists "clinician_pcns_delete_anon" on public.clinician_pcns;
create policy "clinician_pcns_delete_anon"
  on public.clinician_pcns for delete using (true);

drop policy if exists "activity_categories_select_anon" on public.activity_categories;
create policy "activity_categories_select_anon"
  on public.activity_categories for select using (true);
drop policy if exists "activity_categories_insert_anon" on public.activity_categories;
create policy "activity_categories_insert_anon"
  on public.activity_categories for insert with check (true);
drop policy if exists "activity_categories_update_anon" on public.activity_categories;
create policy "activity_categories_update_anon"
  on public.activity_categories for update using (true) with check (true);
drop policy if exists "activity_categories_delete_anon" on public.activity_categories;
create policy "activity_categories_delete_anon"
  on public.activity_categories for delete using (true);

drop policy if exists "activity_logs_select_anon" on public.activity_logs;
create policy "activity_logs_select_anon"
  on public.activity_logs for select using (true);
drop policy if exists "activity_logs_insert_anon" on public.activity_logs;
create policy "activity_logs_insert_anon"
  on public.activity_logs for insert with check (true);
drop policy if exists "activity_logs_update_anon" on public.activity_logs;
create policy "activity_logs_update_anon"
  on public.activity_logs for update using (true) with check (true);
drop policy if exists "activity_logs_delete_anon" on public.activity_logs;
create policy "activity_logs_delete_anon"
  on public.activity_logs for delete using (true);

drop policy if exists "activity_log_entries_select_anon" on public.activity_log_entries;
create policy "activity_log_entries_select_anon"
  on public.activity_log_entries for select using (true);
drop policy if exists "activity_log_entries_insert_anon" on public.activity_log_entries;
create policy "activity_log_entries_insert_anon"
  on public.activity_log_entries for insert with check (true);
drop policy if exists "activity_log_entries_update_anon" on public.activity_log_entries;
create policy "activity_log_entries_update_anon"
  on public.activity_log_entries for update using (true) with check (true);
drop policy if exists "activity_log_entries_delete_anon" on public.activity_log_entries;
create policy "activity_log_entries_delete_anon"
  on public.activity_log_entries for delete using (true);
