-- Phase One schema + RLS for MMV
-- Safe to run in Supabase SQL Editor (no CLI required).

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- profiles
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text,
    created_at timestamptz not null default now()
);

-- player_experiments
create table if not exists public.player_experiments (
    user_id uuid primary key references auth.users (id) on delete cascade,
    config jsonb not null,
    created_at timestamptz not null default now()
);

-- characters
create table if not exists public.characters (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    name text,
    created_at timestamptz not null default now()
);
create index if not exists characters_user_id_idx on public.characters (user_id);

-- daily_states
create table if not exists public.daily_states (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    day_index int not null default 1,
    energy int not null default 100,
    stress int not null default 0,
    vectors jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);
create index if not exists daily_states_user_id_idx on public.daily_states (user_id);

-- storylets
create table if not exists public.storylets (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    title text not null,
    body text not null,
    choices jsonb not null,
    tags text[] not null default '{}'::text[],
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- storylet_runs
create table if not exists public.storylet_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    storylet_id uuid not null references public.storylets (id) on delete cascade,
    day_index int not null,
    choice_id text,
    created_at timestamptz not null default now()
);
create index if not exists storylet_runs_user_id_idx on public.storylet_runs (user_id);
create index if not exists storylet_runs_storylet_id_idx on public.storylet_runs (storylet_id);

-- social_actions
create table if not exists public.social_actions (
    id uuid primary key default gen_random_uuid(),
    from_user_id uuid not null references auth.users (id) on delete cascade,
    to_user_id uuid not null references auth.users (id) on delete cascade,
    action_type text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
create index if not exists social_actions_from_user_id_idx on public.social_actions (from_user_id);
create index if not exists social_actions_to_user_id_idx on public.social_actions (to_user_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.player_experiments enable row level security;
alter table public.characters enable row level security;
alter table public.daily_states enable row level security;
alter table public.storylets enable row level security;
alter table public.storylet_runs enable row level security;
alter table public.social_actions enable row level security;

-- profiles policies
create policy "profiles_select_own" on public.profiles
    for select using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
    for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
    for update using (id = auth.uid());

-- player_experiments policies
create policy "player_experiments_select_own" on public.player_experiments
    for select using (user_id = auth.uid());

create policy "player_experiments_insert_own" on public.player_experiments
    for insert with check (user_id = auth.uid());

create policy "player_experiments_update_own" on public.player_experiments
    for update using (user_id = auth.uid());

-- characters policies
create policy "characters_select_own" on public.characters
    for select using (user_id = auth.uid());

create policy "characters_insert_own" on public.characters
    for insert with check (user_id = auth.uid());

create policy "characters_update_own" on public.characters
    for update using (user_id = auth.uid());

-- daily_states policies
create policy "daily_states_select_own" on public.daily_states
    for select using (user_id = auth.uid());

create policy "daily_states_insert_own" on public.daily_states
    for insert with check (user_id = auth.uid());

create policy "daily_states_update_own" on public.daily_states
    for update using (user_id = auth.uid());

-- storylets policies (read-only for authenticated users, active only)
create policy "storylets_select_active" on public.storylets
    for select using (auth.role() = 'authenticated' and is_active);

-- storylet_runs policies
create policy "storylet_runs_select_own" on public.storylet_runs
    for select using (user_id = auth.uid());

create policy "storylet_runs_insert_own" on public.storylet_runs
    for insert with check (user_id = auth.uid());

create policy "storylet_runs_update_own" on public.storylet_runs
    for update using (user_id = auth.uid());

-- social_actions policies
create policy "social_actions_select_related" on public.social_actions
    for select using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy "social_actions_insert_own" on public.social_actions
    for insert with check (from_user_id = auth.uid());
