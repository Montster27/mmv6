create table if not exists public.player_day_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index int not null,
  energy int not null default 70,
  stress int not null default 20,
  money int not null default 0,
  study_progress int not null default 0,
  social_capital int not null default 0,
  health int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_index)
);

create index if not exists player_day_state_user_id_idx
  on public.player_day_state (user_id);

do $$ begin
  if to_regclass('public.player_day_state') is null then
    return;
  end if;

  alter table public.player_day_state enable row level security;

  begin
    create policy "player_day_state_select_own" on public.player_day_state
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "player_day_state_insert_own" on public.player_day_state
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "player_day_state_update_own" on public.player_day_state
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
