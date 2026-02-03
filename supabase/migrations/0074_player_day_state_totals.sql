alter table public.player_day_state
  add column if not exists total_study int not null default 0,
  add column if not exists total_work int not null default 0,
  add column if not exists total_social int not null default 0,
  add column if not exists total_health int not null default 0,
  add column if not exists total_fun int not null default 0;
