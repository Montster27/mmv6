alter table public.daily_states
add column if not exists relationships jsonb default '{}'::jsonb;
