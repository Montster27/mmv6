create table if not exists public.weekly_competition_snapshot (
  week_start_day_index int primary key,
  top_cohorts jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

do $$ begin
  if to_regclass('public.weekly_competition_snapshot') is null then
    return;
  end if;

  alter table public.weekly_competition_snapshot enable row level security;

  begin
    create policy "weekly_competition_snapshot_select_authenticated" on public.weekly_competition_snapshot
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "weekly_competition_snapshot_insert_authenticated" on public.weekly_competition_snapshot
      for insert with check (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;
end $$;
