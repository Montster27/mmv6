alter table public.player_day_state
  add column if not exists pre_allocation_money int null,
  add column if not exists pre_allocation_study_progress int null,
  add column if not exists pre_allocation_social_capital int null,
  add column if not exists pre_allocation_health int null;
