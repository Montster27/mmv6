-- Time allocations table for daily loop (Phase One)
create extension if not exists "pgcrypto";

create table if not exists public.time_allocations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    day_index int not null,
    allocation jsonb not null,
    created_at timestamptz not null default now(),
    unique (user_id, day_index)
);

create index if not exists time_allocations_user_id_idx on public.time_allocations (user_id);

alter table public.time_allocations enable row level security;

create policy "time_allocations_select_own" on public.time_allocations
    for select using (user_id = auth.uid());

create policy "time_allocations_insert_own" on public.time_allocations
    for insert with check (user_id = auth.uid());

create policy "time_allocations_update_own" on public.time_allocations
    for update using (user_id = auth.uid());
