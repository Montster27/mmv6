alter table public.player_day_state
  add column if not exists allocation_hash text,
  add column if not exists pre_allocation_energy int,
  add column if not exists pre_allocation_stress int;
