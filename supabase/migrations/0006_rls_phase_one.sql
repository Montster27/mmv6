-- Phase One RLS policies matching current app access patterns.
-- Idempotent: each policy creation is wrapped to ignore duplicate_object.

-- Helper macro via DO blocks for each policy

-- A) profiles
alter table if exists public.profiles enable row level security;
do $$ begin
  create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
exception when duplicate_object then null; end $$;

-- B) characters
alter table if exists public.characters enable row level security;
do $$ begin
  create policy "characters_select_own" on public.characters for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "characters_insert_own" on public.characters for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "characters_update_own" on public.characters for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- C) daily_states
alter table if exists public.daily_states enable row level security;
do $$ begin
  create policy "daily_states_select_own" on public.daily_states for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "daily_states_insert_own" on public.daily_states for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "daily_states_update_own" on public.daily_states for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- D) time_allocations
alter table if exists public.time_allocations enable row level security;
do $$ begin
  create policy "time_allocations_select_own" on public.time_allocations for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "time_allocations_insert_own" on public.time_allocations for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "time_allocations_update_own" on public.time_allocations for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- E) storylets
alter table if exists public.storylets enable row level security;
do $$ begin
  create policy "storylets_select_active_public" on public.storylets for select using (is_active);
exception when duplicate_object then null; end $$;
-- No write policies for storylets (managed by admin/service role).

-- F) storylet_runs
alter table if exists public.storylet_runs enable row level security;
do $$ begin
  create policy "storylet_runs_select_own" on public.storylet_runs for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "storylet_runs_insert_own" on public.storylet_runs for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
-- No update/delete needed currently.

-- G) public_profiles
alter table if exists public.public_profiles enable row level security;
do $$ begin
  create policy "public_profiles_select_all" on public.public_profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_profiles_insert_own" on public.public_profiles for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_profiles_update_own" on public.public_profiles for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- H) social_actions
alter table if exists public.social_actions enable row level security;
do $$ begin
  create policy "social_actions_insert_from_self" on public.social_actions for insert with check (from_user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "social_actions_select_related" on public.social_actions for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
exception when duplicate_object then null; end $$;
