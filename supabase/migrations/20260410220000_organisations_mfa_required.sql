-- Future org-wide MFA policy (optional column; app does not enforce yet).
alter table if exists public.organisations
  add column if not exists mfa_required boolean not null default false;

comment on column public.organisations.mfa_required is
  'When true, all org users should enrol MFA (enforcement TBD in app).';
