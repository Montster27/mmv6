do $$ begin
  if to_regclass('public.reports') is null then
    return;
  end if;

  alter table public.reports enable row level security;

  begin
    create policy "reports_select_own" on public.reports
      for select using (reporter_user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "reports_insert_own" on public.reports
      for insert with check (reporter_user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
