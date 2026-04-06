-- Allow anonymous inserts for clinicians (mirror task_batches; tighten when auth ships)
create policy "clinicians_insert_anon" on public.clinicians
  for insert with check (true);
