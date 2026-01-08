-- RLS for hypothesis_anomalies
do $$ begin
  if to_regclass('public.hypothesis_anomalies') is null then
    return;
  end if;

  alter table public.hypothesis_anomalies enable row level security;

  begin
    create policy "hypothesis_anomalies_select_own" on public.hypothesis_anomalies
      for select using (
        exists (
          select 1 from public.hypotheses
          where hypotheses.id = hypothesis_anomalies.hypothesis_id
            and hypotheses.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "hypothesis_anomalies_insert_own" on public.hypothesis_anomalies
      for insert with check (
        exists (
          select 1 from public.hypotheses
          where hypotheses.id = hypothesis_anomalies.hypothesis_id
            and hypotheses.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "hypothesis_anomalies_delete_own" on public.hypothesis_anomalies
      for delete using (
        exists (
          select 1 from public.hypotheses
          where hypotheses.id = hypothesis_anomalies.hypothesis_id
            and hypotheses.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
