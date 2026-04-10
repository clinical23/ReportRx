-- Activity log edit audit trail (safe to re-run)

create extension if not exists "pgcrypto";

create table if not exists public.activity_log_edits (
  id uuid primary key default gen_random_uuid(),
  activity_log_id uuid not null references public.activity_logs (id) on delete cascade,
  edited_by uuid references public.profiles (id) on delete set null,
  edited_at timestamptz not null default now(),
  field_name text not null,
  old_value text,
  new_value text,
  reason text
);

alter table public.activity_log_edits
  add column if not exists activity_log_id uuid references public.activity_logs (id) on delete cascade;
alter table public.activity_log_edits
  add column if not exists edited_by uuid references public.profiles (id) on delete set null;
alter table public.activity_log_edits
  add column if not exists edited_at timestamptz not null default now();
alter table public.activity_log_edits
  add column if not exists field_name text;
alter table public.activity_log_edits
  add column if not exists old_value text;
alter table public.activity_log_edits
  add column if not exists new_value text;
alter table public.activity_log_edits
  add column if not exists reason text;

create index if not exists activity_log_edits_log_id_idx
  on public.activity_log_edits (activity_log_id);
create index if not exists activity_log_edits_edited_at_idx
  on public.activity_log_edits (edited_at desc);
