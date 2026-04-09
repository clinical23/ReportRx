-- Pending invites: linked to auth user on first signup via handle_new_user (no service role needed).

create table if not exists public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  role text not null,
  full_name text not null default '',
  invited_by uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now()
);

create unique index if not exists organisation_invites_email_lower_uniq
  on public.organisation_invites (lower(trim(email)));

create index if not exists organisation_invites_org_id_idx
  on public.organisation_invites (organisation_id);

alter table public.organisation_invites enable row level security;

drop policy if exists "organisation_invites_select_authenticated" on public.organisation_invites;
create policy "organisation_invites_select_authenticated"
  on public.organisation_invites for select to authenticated
  using (
    organisation_id in (
      select p.organisation_id from public.profiles p
      where p.id = auth.uid() and p.organisation_id is not null
    )
  );

drop policy if exists "organisation_invites_insert_authenticated" on public.organisation_invites;
create policy "organisation_invites_insert_authenticated"
  on public.organisation_invites for insert to authenticated
  with check (
    public.get_my_role() in ('admin', 'superadmin')
    and organisation_id = (
      select p.organisation_id from public.profiles p
      where p.id = auth.uid() limit 1
    )
  );

drop policy if exists "organisation_invites_delete_authenticated" on public.organisation_invites;
create policy "organisation_invites_delete_authenticated"
  on public.organisation_invites for delete to authenticated
  using (
    public.get_my_role() in ('admin', 'superadmin')
    and organisation_id = (
      select p.organisation_id from public.profiles p
      where p.id = auth.uid() limit 1
    )
  );

-- Apply pending invite when a new auth user is created (profile row exists from prior trigger runs — see below).
create or replace function public.apply_organisation_invite_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  user_email text;
begin
  select email into user_email from auth.users where id = new.id;
  if user_email is null then
    return new;
  end if;

  select * into inv
  from public.organisation_invites
  where lower(trim(email)) = lower(trim(user_email))
  order by invited_at desc
  limit 1;

  if inv.id is null then
    return new;
  end if;

  update public.profiles p
  set
    organisation_id = inv.organisation_id,
    role = inv.role,
    full_name = case
      when coalesce(nullif(trim(inv.full_name), ''), '') <> '' then trim(inv.full_name)
      else p.full_name
    end
  where p.id = new.id;

  delete from public.organisation_invites where id = inv.id;

  return new;
end;
$$;

drop trigger if exists on_profile_created_apply_invite on public.profiles;
create trigger on_profile_created_apply_invite
  after insert on public.profiles
  for each row
  execute procedure public.apply_organisation_invite_for_user();
