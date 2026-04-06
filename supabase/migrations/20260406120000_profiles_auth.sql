-- Profiles linked to Supabase Auth users

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null
    constraint profiles_role_check
      check (role in ('clinician', 'practice_manager', 'pcn_manager')),
  full_name text not null,
  practice_id uuid references public.practices (id) on delete set null
);

create index if not exists profiles_practice_id_idx on public.profiles (practice_id);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup (role/full_name can be overridden in dashboard or metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'clinician');
  if r not in ('clinician', 'practice_manager', 'pcn_manager') then
    r := 'clinician';
  end if;

  insert into public.profiles (id, role, full_name, practice_id)
  values (
    new.id,
    r,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    null
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
