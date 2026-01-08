-- RLS for hypothesis_anomalies
alter table if exists public.hypothesis_anomalies enable row level security;

do $$ begin
  create policy "hypothesis_anomalies_select_own" on public.hypothesis_anomalies
    for select using (
      exists (
        select 1 from public.hypotheses
        where hypotheses.id = hypothesis_anomalies.hypothesis_id
          and hypotheses.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "hypothesis_anomalies_insert_own" on public.hypothesis_anomalies
    for insert with check (
      exists (
        select 1 from public.hypotheses
        where hypotheses.id = hypothesis_anomalies.hypothesis_id
          and hypotheses.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "hypothesis_anomalies_delete_own" on public.hypothesis_anomalies
    for delete using (
      exists (
        select 1 from public.hypotheses
        where hypotheses.id = hypothesis_anomalies.hypothesis_id
          and hypotheses.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
