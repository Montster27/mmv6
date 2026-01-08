-- Phase Two: user season state
create table if not exists public.user_seasons (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    current_season_index int not null default 1,
    last_seen_season_index int not null default 1,
    last_reset_at timestamptz null,
    last_recap jsonb null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists user_seasons_user_unique
  on public.user_seasons (user_id);
