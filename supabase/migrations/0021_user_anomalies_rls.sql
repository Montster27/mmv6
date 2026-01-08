-- RLS for user_anomalies
alter table if exists public.user_anomalies enable row level security;

do $$ begin
  create policy "user_anomalies_select_own" on public.user_anomalies for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_anomalies_insert_own" on public.user_anomalies for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
