create table if not exists public.world_state_weekly (
  week_start_day_index int primary key,
  week_end_day_index int not null,
  influence jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

do $$ begin
  if to_regclass('public.world_state_weekly') is null then
    return;
  end if;

  alter table public.world_state_weekly enable row level security;

  begin
    create policy "world_state_weekly_select_authenticated" on public.world_state_weekly
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "world_state_weekly_insert_authenticated" on public.world_state_weekly
      for insert with check (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;
end $$;
