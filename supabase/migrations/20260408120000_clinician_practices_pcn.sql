-- Many-to-many clinicians ↔ practices; PCN on clinician; remove single practice + caseload

create table if not exists public.clinician_practices (
  clinician_id uuid not null references public.clinicians (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  primary key (clinician_id, practice_id)
);

create index if not exists clinician_practices_practice_id_idx
  on public.clinician_practices (practice_id);

alter table public.clinicians
  add column if not exists pcn_name text;

-- Move existing single-practice links into the junction table (safe if empty)
insert into public.clinician_practices (clinician_id, practice_id)
select c.id, c.practice_id
from public.clinicians c
where c.practice_id is not null
on conflict do nothing;

alter table public.clinicians
  drop constraint if exists clinicians_practice_id_fkey;

alter table public.clinicians
  drop column if exists practice_id;

alter table public.clinicians
  drop column if exists active_caseload;

alter table public.clinician_practices enable row level security;

create policy "clinician_practices_select_anon"
  on public.clinician_practices for select using (true);

create policy "clinician_practices_insert_anon"
  on public.clinician_practices for insert with check (true);

create policy "clinician_practices_update_anon"
  on public.clinician_practices for update using (true) with check (true);

create policy "clinician_practices_delete_anon"
  on public.clinician_practices for delete using (true);
