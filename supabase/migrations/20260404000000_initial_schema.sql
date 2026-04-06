-- ReportRx: task_batches + clinicians (run in Supabase SQL editor or via CLI)

create extension if not exists "uuid-ossp";

create table if not exists public.clinicians (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null default 'Clinician',
  active_caseload integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_batches (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  due_at timestamptz,
  total_tasks integer not null default 0 check (total_tasks >= 0),
  completed_tasks integer not null default 0 check (completed_tasks >= 0),
  clinician_id uuid references public.clinicians (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_tasks <= total_tasks)
);

create index if not exists task_batches_due_at_idx on public.task_batches (due_at);
create index if not exists task_batches_clinician_id_idx on public.task_batches (clinician_id);

alter table public.clinicians enable row level security;
alter table public.task_batches enable row level security;

-- Permissive policies for anon dashboard (replace with auth-scoped policies in production)
create policy "clinicians_select_anon" on public.clinicians
  for select using (true);

create policy "task_batches_select_anon" on public.task_batches
  for select using (true);

create policy "task_batches_insert_anon" on public.task_batches
  for insert with check (true);

create policy "task_batches_update_anon" on public.task_batches
  for update using (true) with check (true);
