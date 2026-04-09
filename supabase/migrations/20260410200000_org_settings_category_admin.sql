-- Organisation settings (default hours, etc.) + admin category policies
-- Safe to re-run: additive columns and policies.

alter table if exists public.organisations
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table if exists public.activity_categories
  add column if not exists organisation_id uuid;

create index if not exists activity_categories_organisation_id_idx
  on public.activity_categories (organisation_id);

-- Allow org admins to manage categories scoped to their organisation
drop policy if exists "activity_categories_org_admin_select" on public.activity_categories;
create policy "activity_categories_org_admin_select"
  on public.activity_categories for select to authenticated
  using (
    public.get_my_role() in ('admin', 'superadmin')
    and organisation_id is not null
    and organisation_id = (
      select p.organisation_id
      from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id is not null
      limit 1
    )
  );

drop policy if exists "activity_categories_org_admin_insert" on public.activity_categories;
create policy "activity_categories_org_admin_insert"
  on public.activity_categories for insert to authenticated
  with check (
    public.get_my_role() in ('admin', 'superadmin')
    and organisation_id is not null
    and organisation_id = (
      select p.organisation_id
      from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id is not null
      limit 1
    )
  );

drop policy if exists "activity_categories_org_admin_update" on public.activity_categories;
create policy "activity_categories_org_admin_update"
  on public.activity_categories for update to authenticated
  using (
    public.get_my_role() in ('admin', 'superadmin')
    and organisation_id is not null
    and organisation_id = (
      select p.organisation_id
      from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id is not null
      limit 1
    )
  )
  with check (
    public.get_my_role() in ('admin', 'superadmin')
    and organisation_id is not null
    and organisation_id = (
      select p.organisation_id
      from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id is not null
      limit 1
    )
  );
