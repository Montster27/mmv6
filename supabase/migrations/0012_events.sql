-- Phase One: analytics events (append-only)
create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    day_index int,
    event_type text not null,
    stage text,
    ts timestamptz not null default now(),
    payload jsonb not null default '{}'::jsonb
);

create index if not exists events_user_ts_idx on public.events (user_id, ts desc);
create index if not exists events_user_day_idx on public.events (user_id, day_index);
create index if not exists events_type_idx on public.events (event_type);
