-- Daily cadence fields for UTC-based day advancement
alter table public.daily_states
  add column if not exists start_date date not null default (now() at time zone 'utc')::date,
  add column if not exists last_day_completed date,
  add column if not exists last_day_index_completed int;

create index if not exists daily_states_user_id_idx on public.daily_states (user_id);
