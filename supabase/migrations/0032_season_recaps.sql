-- Phase Two: season recaps
create table if not exists public.season_recaps (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    season_index int not null,
    personal jsonb not null,
    world jsonb not null,
    created_at timestamptz not null default now()
);

do $$ begin
  alter table public.season_recaps
    add constraint season_recaps_unique unique (user_id, season_index);
exception when duplicate_object then null; end $$;

create index if not exists season_recaps_user_idx
  on public.season_recaps (user_id, season_index);
