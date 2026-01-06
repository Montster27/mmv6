-- Public player directory for social boosts
create extension if not exists "pgcrypto";

create table if not exists public.public_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    created_at timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

-- Authenticated users can view all public profiles
create policy "public_profiles_select_all" on public.public_profiles
    for select using (auth.role() = 'authenticated');

-- Users can insert their own public profile
create policy "public_profiles_insert_own" on public.public_profiles
    for insert with check (user_id = auth.uid());

-- Users can update their own public profile
create policy "public_profiles_update_own" on public.public_profiles
    for update using (user_id = auth.uid());
