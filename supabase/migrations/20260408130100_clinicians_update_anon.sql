-- Mirror task_batches: allow anon updates for dashboard (tighten when auth ships)
create policy "clinicians_update_anon" on public.clinicians
  for update using (true) with check (true);
