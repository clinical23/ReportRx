-- ReportRx: remove permissive anon RLS; authenticated policies scoped by profiles.role / practice / PCN.
-- Adds activity_categories.practice_id and extends activity_report with practice_id for app filters.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER reads profiles; bypasses profiles RLS)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_practice_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select practice_id from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_clinician_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.clinicians c
  inner join public.profiles p on p.id = auth.uid()
  where lower(trim(c.name)) = lower(trim(p.full_name))
  limit 1;
$$;

create or replace function public.practice_id_in_my_pcn(check_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.get_my_role() is distinct from 'pcn_manager' then false
    when public.get_my_practice_id() is null then false
    when check_id = public.get_my_practice_id() then true
    else exists (
      select 1
      from public.practices home
      inner join public.practices other on other.id = check_id
      where home.id = public.get_my_practice_id()
        and home.pcn_name is not null
        and other.pcn_name = home.pcn_name
    )
  end;
$$;

create or replace function public.clinician_row_visible(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when cid is null then false
    when public.get_my_role() = 'clinician' then cid = public.get_my_clinician_id()
    when public.get_my_role() = 'practice_manager' then exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = cid
        and cp.practice_id = public.get_my_practice_id()
    )
    when public.get_my_role() = 'pcn_manager' then exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = cid
        and public.practice_id_in_my_pcn(cp.practice_id)
    )
    else false
  end;
$$;

create or replace function public.clinician_can_log_at_practice(cid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_clinician_id() is not distinct from cid
    and (
      pid is not distinct from public.get_my_practice_id()
      or exists (
        select 1 from public.clinician_practices cp
        where cp.clinician_id = cid and cp.practice_id = pid
      )
    );
$$;

grant execute on function public.get_my_practice_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_clinician_id() to authenticated;
grant execute on function public.practice_id_in_my_pcn(uuid) to authenticated;
grant execute on function public.clinician_row_visible(uuid) to authenticated;
grant execute on function public.clinician_can_log_at_practice(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- activity_categories: tenant column + uniqueness per practice
-- ---------------------------------------------------------------------------
alter table public.activity_categories
  add column if not exists practice_id uuid references public.practices (id) on delete cascade;

create index if not exists activity_categories_practice_id_idx
  on public.activity_categories (practice_id);

drop index if exists activity_categories_name_uniq;

create unique index if not exists activity_categories_practice_name_uniq
  on public.activity_categories (practice_id, name)
  where practice_id is not null;

create unique index if not exists activity_categories_global_name_uniq
  on public.activity_categories (name)
  where practice_id is null;

-- ---------------------------------------------------------------------------
-- activity_report: include practice_id for PostgREST filters
-- ---------------------------------------------------------------------------
drop view if exists public.activity_report;

create view public.activity_report as
select
  l.id::text as log_id,
  l.log_date::text as log_date,
  l.hours_worked,
  coalesce(c.name, '') as clinician_name,
  coalesce(p.name, '') as practice_name,
  coalesce(ac.name, '') as category_name,
  e.count::integer as appointment_count,
  l.practice_id
from public.activity_log_entries e
join public.activity_logs l on l.id = e.log_id
join public.clinicians c on c.id = l.clinician_id
join public.practices p on p.id = l.practice_id
join public.activity_categories ac on ac.id = e.category_id;

grant select on public.activity_report to authenticated;

-- ---------------------------------------------------------------------------
-- Drop permissive anon policies
-- ---------------------------------------------------------------------------
drop policy if exists "practices_select_anon" on public.practices;
drop policy if exists "practices_insert_anon" on public.practices;
drop policy if exists "practices_update_anon" on public.practices;
drop policy if exists "practices_delete_anon" on public.practices;

drop policy if exists "pcns_select_anon" on public.pcns;
drop policy if exists "pcns_insert_anon" on public.pcns;
drop policy if exists "pcns_update_anon" on public.pcns;
drop policy if exists "pcns_delete_anon" on public.pcns;

drop policy if exists "clinician_pcns_select_anon" on public.clinician_pcns;
drop policy if exists "clinician_pcns_insert_anon" on public.clinician_pcns;
drop policy if exists "clinician_pcns_update_anon" on public.clinician_pcns;
drop policy if exists "clinician_pcns_delete_anon" on public.clinician_pcns;

drop policy if exists "activity_categories_select_anon" on public.activity_categories;
drop policy if exists "activity_categories_insert_anon" on public.activity_categories;
drop policy if exists "activity_categories_update_anon" on public.activity_categories;
drop policy if exists "activity_categories_delete_anon" on public.activity_categories;

drop policy if exists "activity_logs_select_anon" on public.activity_logs;
drop policy if exists "activity_logs_insert_anon" on public.activity_logs;
drop policy if exists "activity_logs_update_anon" on public.activity_logs;
drop policy if exists "activity_logs_delete_anon" on public.activity_logs;

drop policy if exists "activity_log_entries_select_anon" on public.activity_log_entries;
drop policy if exists "activity_log_entries_insert_anon" on public.activity_log_entries;
drop policy if exists "activity_log_entries_update_anon" on public.activity_log_entries;
drop policy if exists "activity_log_entries_delete_anon" on public.activity_log_entries;

drop policy if exists "clinicians_select_anon" on public.clinicians;
drop policy if exists "clinicians_insert_anon" on public.clinicians;
drop policy if exists "clinicians_update_anon" on public.clinicians;

drop policy if exists "task_batches_select_anon" on public.task_batches;
drop policy if exists "task_batches_insert_anon" on public.task_batches;
drop policy if exists "task_batches_update_anon" on public.task_batches;

drop policy if exists "tasks_select_anon" on public.tasks;
drop policy if exists "tasks_insert_anon" on public.tasks;

drop policy if exists "clinician_practices_select_anon" on public.clinician_practices;
drop policy if exists "clinician_practices_insert_anon" on public.clinician_practices;
drop policy if exists "clinician_practices_update_anon" on public.clinician_practices;
drop policy if exists "clinician_practices_delete_anon" on public.clinician_practices;

-- ---------------------------------------------------------------------------
-- practices
-- ---------------------------------------------------------------------------
drop policy if exists "practices_select_authenticated" on public.practices;
create policy "practices_select_authenticated"
  on public.practices for select to authenticated
  using (true);

drop policy if exists "practices_insert_authenticated" on public.practices;
create policy "practices_insert_authenticated"
  on public.practices for insert to authenticated
  with check (public.get_my_role() in ('practice_manager', 'pcn_manager'));

drop policy if exists "practices_update_authenticated" on public.practices;
create policy "practices_update_authenticated"
  on public.practices for update to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and id = public.get_my_practice_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(id))
  )
  with check (
    (public.get_my_role() = 'practice_manager' and id = public.get_my_practice_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(id))
  );

drop policy if exists "practices_delete_authenticated" on public.practices;
create policy "practices_delete_authenticated"
  on public.practices for delete to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and id = public.get_my_practice_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(id))
  );

-- ---------------------------------------------------------------------------
-- pcns
-- ---------------------------------------------------------------------------
drop policy if exists "pcns_select_authenticated" on public.pcns;
create policy "pcns_select_authenticated"
  on public.pcns for select to authenticated
  using (true);

drop policy if exists "pcns_insert_authenticated" on public.pcns;
create policy "pcns_insert_authenticated"
  on public.pcns for insert to authenticated
  with check (public.get_my_role() in ('practice_manager', 'pcn_manager'));

drop policy if exists "pcns_update_authenticated" on public.pcns;
create policy "pcns_update_authenticated"
  on public.pcns for update to authenticated
  using (public.get_my_role() in ('practice_manager', 'pcn_manager'))
  with check (public.get_my_role() in ('practice_manager', 'pcn_manager'));

drop policy if exists "pcns_delete_authenticated" on public.pcns;
create policy "pcns_delete_authenticated"
  on public.pcns for delete to authenticated
  using (public.get_my_role() in ('practice_manager', 'pcn_manager'));

-- ---------------------------------------------------------------------------
-- clinicians
-- ---------------------------------------------------------------------------
drop policy if exists "clinicians_select_authenticated" on public.clinicians;
create policy "clinicians_select_authenticated"
  on public.clinicians for select to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinicians.id
        and cp.practice_id = public.get_my_practice_id()
    ))
    or (public.get_my_role() = 'clinician' and id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinicians.id
        and public.practice_id_in_my_pcn(cp.practice_id)
    ))
  );

drop policy if exists "clinicians_insert_authenticated" on public.clinicians;
create policy "clinicians_insert_authenticated"
  on public.clinicians for insert to authenticated
  with check (
    public.get_my_role() = 'practice_manager'
    and public.get_my_practice_id() is not null
  );

drop policy if exists "clinicians_update_authenticated" on public.clinicians;
create policy "clinicians_update_authenticated"
  on public.clinicians for update to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinicians.id
        and cp.practice_id = public.get_my_practice_id()
    )
  )
  with check (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinicians.id
        and cp.practice_id = public.get_my_practice_id()
    )
  );

drop policy if exists "clinicians_delete_authenticated" on public.clinicians;
create policy "clinicians_delete_authenticated"
  on public.clinicians for delete to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinicians.id
        and cp.practice_id = public.get_my_practice_id()
    )
  );

-- ---------------------------------------------------------------------------
-- clinician_practices
-- ---------------------------------------------------------------------------
drop policy if exists "clinician_practices_select_authenticated" on public.clinician_practices;
create policy "clinician_practices_select_authenticated"
  on public.clinician_practices for select to authenticated
  using (
    practice_id = public.get_my_practice_id()
    or public.practice_id_in_my_pcn(practice_id)
    or (
      public.get_my_role() = 'clinician'
      and clinician_id = public.get_my_clinician_id()
    )
  );

drop policy if exists "clinician_practices_insert_authenticated" on public.clinician_practices;
create policy "clinician_practices_insert_authenticated"
  on public.clinician_practices for insert to authenticated
  with check (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  );

drop policy if exists "clinician_practices_update_authenticated" on public.clinician_practices;
create policy "clinician_practices_update_authenticated"
  on public.clinician_practices for update to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  )
  with check (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  );

drop policy if exists "clinician_practices_delete_authenticated" on public.clinician_practices;
create policy "clinician_practices_delete_authenticated"
  on public.clinician_practices for delete to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  );

-- ---------------------------------------------------------------------------
-- clinician_pcns
-- ---------------------------------------------------------------------------
drop policy if exists "clinician_pcns_select_authenticated" on public.clinician_pcns;
create policy "clinician_pcns_select_authenticated"
  on public.clinician_pcns for select to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinician_pcns.clinician_id
        and cp.practice_id = public.get_my_practice_id()
    ))
    or (public.get_my_role() = 'pcn_manager' and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinician_pcns.clinician_id
        and public.practice_id_in_my_pcn(cp.practice_id)
    ))
  );

drop policy if exists "clinician_pcns_insert_authenticated" on public.clinician_pcns;
create policy "clinician_pcns_insert_authenticated"
  on public.clinician_pcns for insert to authenticated
  with check (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinician_pcns.clinician_id
        and cp.practice_id = public.get_my_practice_id()
    )
  );

drop policy if exists "clinician_pcns_update_authenticated" on public.clinician_pcns;
create policy "clinician_pcns_update_authenticated"
  on public.clinician_pcns for update to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinician_pcns.clinician_id
        and cp.practice_id = public.get_my_practice_id()
    )
  )
  with check (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinician_pcns.clinician_id
        and cp.practice_id = public.get_my_practice_id()
    )
  );

drop policy if exists "clinician_pcns_delete_authenticated" on public.clinician_pcns;
create policy "clinician_pcns_delete_authenticated"
  on public.clinician_pcns for delete to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and exists (
      select 1 from public.clinician_practices cp
      where cp.clinician_id = clinician_pcns.clinician_id
        and cp.practice_id = public.get_my_practice_id()
    )
  );

-- ---------------------------------------------------------------------------
-- activity_categories
-- ---------------------------------------------------------------------------
drop policy if exists "activity_categories_select_authenticated" on public.activity_categories;
create policy "activity_categories_select_authenticated"
  on public.activity_categories for select to authenticated
  using (
    practice_id is null
    or practice_id = public.get_my_practice_id()
    or public.practice_id_in_my_pcn(practice_id)
  );

drop policy if exists "activity_categories_insert_authenticated" on public.activity_categories;
create policy "activity_categories_insert_authenticated"
  on public.activity_categories for insert to authenticated
  with check (
    public.get_my_role() = 'practice_manager'
    and practice_id is not null
    and practice_id = public.get_my_practice_id()
  );

drop policy if exists "activity_categories_update_authenticated" on public.activity_categories;
create policy "activity_categories_update_authenticated"
  on public.activity_categories for update to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  )
  with check (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  );

drop policy if exists "activity_categories_delete_authenticated" on public.activity_categories;
create policy "activity_categories_delete_authenticated"
  on public.activity_categories for delete to authenticated
  using (
    public.get_my_role() = 'practice_manager'
    and practice_id = public.get_my_practice_id()
  );

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------
drop policy if exists "activity_logs_select_authenticated" on public.activity_logs;
create policy "activity_logs_select_authenticated"
  on public.activity_logs for select to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
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
  );

drop policy if exists "activity_logs_update_authenticated" on public.activity_logs;
create policy "activity_logs_update_authenticated"
  on public.activity_logs for update to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
  )
  with check (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
  );

drop policy if exists "activity_logs_delete_authenticated" on public.activity_logs;
create policy "activity_logs_delete_authenticated"
  on public.activity_logs for delete to authenticated
  using (
    (public.get_my_role() = 'practice_manager' and practice_id = public.get_my_practice_id())
    or (public.get_my_role() = 'clinician' and clinician_id = public.get_my_clinician_id())
    or (public.get_my_role() = 'pcn_manager' and public.practice_id_in_my_pcn(practice_id))
  );

-- ---------------------------------------------------------------------------
-- activity_log_entries (inherit visibility via parent log)
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
        )
    )
  );

-- ---------------------------------------------------------------------------
-- task_batches
-- ---------------------------------------------------------------------------
drop policy if exists "task_batches_select_authenticated" on public.task_batches;
create policy "task_batches_select_authenticated"
  on public.task_batches for select to authenticated
  using (public.clinician_row_visible(clinician_id));

drop policy if exists "task_batches_insert_authenticated" on public.task_batches;
create policy "task_batches_insert_authenticated"
  on public.task_batches for insert to authenticated
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and public.clinician_row_visible(clinician_id)
  );

drop policy if exists "task_batches_update_authenticated" on public.task_batches;
create policy "task_batches_update_authenticated"
  on public.task_batches for update to authenticated
  using (public.clinician_row_visible(clinician_id))
  with check (public.clinician_row_visible(clinician_id));

drop policy if exists "task_batches_delete_authenticated" on public.task_batches;
create policy "task_batches_delete_authenticated"
  on public.task_batches for delete to authenticated
  using (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and public.clinician_row_visible(clinician_id)
  );

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
drop policy if exists "tasks_select_authenticated" on public.tasks;
create policy "tasks_select_authenticated"
  on public.tasks for select to authenticated
  using (public.clinician_row_visible(clinician_id));

drop policy if exists "tasks_insert_authenticated" on public.tasks;
create policy "tasks_insert_authenticated"
  on public.tasks for insert to authenticated
  with check (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and public.clinician_row_visible(clinician_id)
  );

drop policy if exists "tasks_update_authenticated" on public.tasks;
create policy "tasks_update_authenticated"
  on public.tasks for update to authenticated
  using (public.clinician_row_visible(clinician_id))
  with check (public.clinician_row_visible(clinician_id));

drop policy if exists "tasks_delete_authenticated" on public.tasks;
create policy "tasks_delete_authenticated"
  on public.tasks for delete to authenticated
  using (
    public.get_my_role() in ('practice_manager', 'pcn_manager')
    and public.clinician_row_visible(clinician_id)
  );
