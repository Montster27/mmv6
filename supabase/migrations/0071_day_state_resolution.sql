alter table public.player_day_state
  add column if not exists resolved_at timestamptz,
  add column if not exists end_energy int,
  add column if not exists end_stress int,
  add column if not exists next_energy int,
  add column if not exists next_stress int;
