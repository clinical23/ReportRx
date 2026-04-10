-- Profile-scoped clinician ↔ practice assignments (activity log filtering + admin UI).

create table if not exists public.clinician_practice_assignments (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles (id) on delete set null,
  unique (clinician_id, practice_id)
);

create index if not exists clinician_practice_assignments_org_idx
  on public.clinician_practice_assignments (organisation_id);

create index if not exists clinician_practice_assignments_clinician_idx
  on public.clinician_practice_assignments (clinician_id);

alter table public.clinician_practice_assignments enable row level security;

drop policy if exists "clinician_practice_assignments_select_same_org" on public.clinician_practice_assignments;
create policy "clinician_practice_assignments_select_same_org"
  on public.clinician_practice_assignments for select to authenticated
  using (
    organisation_id = (
      select p.organisation_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists "clinician_practice_assignments_insert_admin" on public.clinician_practice_assignments;
create policy "clinician_practice_assignments_insert_admin"
  on public.clinician_practice_assignments for insert to authenticated
  with check (
    organisation_id = (
      select p.organisation_id from public.profiles p where p.id = auth.uid()
    )
    and (select pr.role from public.profiles pr where pr.id = auth.uid()) in ('admin', 'superadmin')
  );

drop policy if exists "clinician_practice_assignments_delete_admin" on public.clinician_practice_assignments;
create policy "clinician_practice_assignments_delete_admin"
  on public.clinician_practice_assignments for delete to authenticated
  using (
    organisation_id = (
      select p.organisation_id from public.profiles p where p.id = auth.uid()
    )
    and (select pr.role from public.profiles pr where pr.id = auth.uid()) in ('admin', 'superadmin')
  );
