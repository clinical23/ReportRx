-- Superadmin/org-admin: activity log access, optional PCN/practice is_active

-- ---------------------------------------------------------------------------
-- Helper: current user's organisation (for org-scoped admin RLS)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_organisation_id() to authenticated;

-- Ensure tenant column exists for org-scoped policies
alter table public.activity_logs
  add column if not exists organisation_id uuid references public.organisations (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- activity_logs: allow org admin / manager / superadmin same organisation
-- ---------------------------------------------------------------------------
drop policy if exists "activity_logs_select_authenticated" on public.activity_logs;
create policy "activity_logs_select_authenticated"
  on public.activity_logs for select to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
    or (
      public.get_my_role() in ('admin', 'superadmin', 'manager')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "activity_logs_insert_authenticated" on public.activity_logs;
create policy "activity_logs_insert_authenticated"
  on public.activity_logs for insert to authenticated
  with check (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (
      public.get_my_role() = 'clinician'
      and public.clinician_can_log_at_practice(clinician_id, practice_id)
    )
    or (
      public.get_my_role() = 'pcn_manager'
      and public.practice_id_in_my_pcn(practice_id)
    )
    or (
      public.get_my_role() in ('admin', 'superadmin', 'manager')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "activity_logs_update_authenticated" on public.activity_logs;
create policy "activity_logs_update_authenticated"
  on public.activity_logs for update to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
    or (
      public.get_my_role() in ('admin', 'superadmin', 'manager')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  )
  with check (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
    or (
      public.get_my_role() in ('admin', 'superadmin', 'manager')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "activity_logs_delete_authenticated" on public.activity_logs;
create policy "activity_logs_delete_authenticated"
  on public.activity_logs for delete to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

-- ---------------------------------------------------------------------------
-- activity_log_entries: mirror parent log access
-- ---------------------------------------------------------------------------
drop policy if exists "activity_log_entries_select_authenticated" on public.activity_log_entries;
create policy "activity_log_entries_select_authenticated"
  on public.activity_log_entries for select to authenticated
  using (
    exists (
      select 1 from public.activity_logs l
      where l.id = activity_log_entries.log_id
        and (
          (public.get_my_role() = 'practice_manager' and l.practice_id = public.get_my_practice_id())
          or (public.get_my_role() = 'clinician' and l.clinician_id = public.get_my_clinician_id())
          or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(l.practice_id))
          or (
            public.get_my_role() in ('admin', 'superadmin', 'manager')
            and l.organisation_id is not distinct from public.get_my_organisation_id()
          )
        )
    )
  );

drop policy if exists "activity_log_entries_insert_authenticated" on public.activity_log_entries;
create policy "activity_log_entries_insert_authenticated"
  on public.activity_log_entries for insert to authenticated
  with check (
    exists (
      select 1 from public.activity_logs l
      where l.id = activity_log_entries.log_id
        and (
          (public.get_my_role() = 'practice_manager' and l.practice_id = public.get_my_practice_id())
          or (
            public.get_my_role() = 'clinician'
            and public.clinician_can_log_at_practice(l.clinician_id, l.practice_id)
          )
          or (
            public.get_my_role() = 'pcn_manager'
            and public.practice_id_in_my_pcn(l.practice_id)
          )
          or (
            public.get_my_role() in ('admin', 'superadmin', 'manager')
            and l.organisation_id is not distinct from public.get_my_organisation_id()
          )
        )
    )
  );

drop policy if exists "activity_log_entries_update_authenticated" on public.activity_log_entries;
create policy "activity_log_entries_update_authenticated"
  on public.activity_log_entries for update to authenticated
  using (
    exists (
      select 1 from public.activity_logs l
      where l.id = activity_log_entries.log_id
        and (
          (public.get_my_role() = 'practice_manager' and l.practice_id = public.get_my_practice_id())
          or (public.get_my_role() = 'clinician' and l.clinician_id = public.get_my_clinician_id())
          or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(l.practice_id))
          or (
            public.get_my_role() in ('admin', 'superadmin', 'manager')
            and l.organisation_id is not distinct from public.get_my_organisation_id()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.activity_logs l
      where l.id = activity_log_entries.log_id
        and (
          (public.get_my_role() = 'practice_manager' and l.practice_id = public.get_my_practice_id())
          or (public.get_my_role() = 'clinician' and l.clinician_id = public.get_my_clinician_id())
          or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(l.practice_id))
          or (
            public.get_my_role() in ('admin', 'superadmin', 'manager')
            and l.organisation_id is not distinct from public.get_my_organisation_id()
          )
        )
    )
  );

drop policy if exists "activity_log_entries_delete_authenticated" on public.activity_log_entries;
create policy "activity_log_entries_delete_authenticated"
  on public.activity_log_entries for delete to authenticated
  using (
    exists (
      select 1 from public.activity_logs l
      where l.id = activity_log_entries.log_id
        and (
          (public.get_my_role() = 'practice_manager' and l.practice_id = public.get_my_practice_id())
          or (public.get_my_role() = 'clinician' and l.clinician_id = public.get_my_clinician_id())
          or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(l.practice_id))
          or (
            public.get_my_role() in ('admin', 'superadmin')
            and l.organisation_id is not distinct from public.get_my_organisation_id()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- PCNs / practices: organisation scope + is_active (soft archive)
-- ---------------------------------------------------------------------------
alter table public.pcns
  add column if not exists organisation_id uuid references public.organisations (id) on delete cascade;

alter table public.practices
  add column if not exists organisation_id uuid references public.organisations (id) on delete cascade;

alter table public.practices
  add column if not exists pcn_id uuid references public.pcns (id) on delete set null;

alter table public.pcns
  add column if not exists is_active boolean not null default true;

alter table public.practices
  add column if not exists is_active boolean not null default true;

-- ---------------------------------------------------------------------------
-- PCNs / practices: org admins can manage rows in their organisation
-- ---------------------------------------------------------------------------
drop policy if exists "pcns_insert_authenticated" on public.pcns;
create policy "pcns_insert_authenticated"
  on public.pcns for insert to authenticated
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "pcns_update_authenticated" on public.pcns;
create policy "pcns_update_authenticated"
  on public.pcns for update to authenticated
  using (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  )
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "pcns_delete_authenticated" on public.pcns;
create policy "pcns_delete_authenticated"
  on public.pcns for delete to authenticated
  using (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "practices_insert_authenticated" on public.practices;
create policy "practices_insert_authenticated"
  on public.practices for insert to authenticated
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "practices_update_authenticated" on public.practices;
create policy "practices_update_authenticated"
  on public.practices for update to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and id = public.get_my_practice_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(id))
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  )
  with check (
    (public.get_my_role() = 'practice_manager' and id = public.get_my_practice_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(id))
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );

drop policy if exists "practices_delete_authenticated" on public.practices;
create policy "practices_delete_authenticated"
  on public.practices for delete to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and id = public.get_my_practice_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(id))
    or (
      public.get_my_role() in ('admin', 'superadmin')
      and organisation_id is not distinct from public.get_my_organisation_id()
    )
  );
