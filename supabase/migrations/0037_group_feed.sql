create table if not exists public.group_feed (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  ts timestamptz not null default now(),
  event_type text not null,
  actor_user_id uuid null references auth.users(id),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists group_feed_group_ts_idx on public.group_feed (group_id, ts desc);
