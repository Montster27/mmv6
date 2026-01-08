-- RLS for anomalies catalog
alter table if exists public.anomalies enable row level security;

-- Public read access
create policy "anomalies_select_all" on public.anomalies
  for select using (true);
