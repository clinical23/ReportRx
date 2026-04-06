-- Individual tasks (separate from task_batches)

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  status text not null default 'Open',
  clinician_id uuid references public.clinicians (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_clinician_id_idx on public.tasks (clinician_id);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

alter table public.tasks enable row level security;

create policy "tasks_select_anon" on public.tasks
  for select using (true);

create policy "tasks_insert_anon" on public.tasks
  for insert with check (true);
