-- ReportRx: link auth profiles to directory clinicians via profiles.clinician_id
--
-- Backfill (run manually after deploy if needed): existing profiles can be matched to
-- clinicians by name once, e.g.
--   UPDATE public.profiles p
--   SET clinician_id = c.id
--   FROM public.clinicians c
--   WHERE p.clinician_id IS NULL
--     AND lower(trim(p.full_name)) = lower(trim(c.name));
-- Then resolve duplicates / verify rows before enforcing app reliance on clinician_id.

alter table public.profiles
  add column if not exists clinician_id uuid references public.clinicians (id) on delete set null;

create index if not exists profiles_clinician_id_idx on public.profiles (clinician_id);

-- At most one profile per non-null clinician_id (multiple NULL clinician_id allowed)
create unique index if not exists profiles_clinician_id_unique
  on public.profiles (clinician_id)
  where clinician_id is not null;

-- Prefer profiles.clinician_id for RLS helpers (replaces name matching in 20260409100000_secure_rls.sql)
create or replace function public.get_my_clinician_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinician_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_clinician_id() to authenticated;
