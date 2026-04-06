-- Link clinicians to a practice (optional)

alter table public.clinicians
  add column if not exists practice_id uuid references public.practices (id) on delete set null;

create index if not exists clinicians_practice_id_idx on public.clinicians (practice_id);
