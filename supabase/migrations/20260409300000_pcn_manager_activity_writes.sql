-- Allow pcn_manager to INSERT/UPDATE activity_logs and activity_log_entries like practice scope,
-- and to mutate activity_categories for their home practice (profiles.practice_id).

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
        )
    )
  );

drop policy if exists "activity_categories_insert_authenticated" on public.activity_categories;
create policy "activity_categories_insert_authenticated"
  on public.activity_categories for insert to authenticated
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and practice_id is not null
    and practice_id = public.get_my_practice_id()
  );

drop policy if exists "activity_categories_update_authenticated" on public.activity_categories;
create policy "activity_categories_update_authenticated"
  on public.activity_categories for update to authenticated
  using (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and practice_id = public.get_my_practice_id()
  )
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and practice_id = public.get_my_practice_id()
  );

drop policy if exists "activity_categories_delete_authenticated" on public.activity_categories;
create policy "activity_categories_delete_authenticated"
  on public.activity_categories for delete to authenticated
  using (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and practice_id = public.get_my_practice_id()
  );
