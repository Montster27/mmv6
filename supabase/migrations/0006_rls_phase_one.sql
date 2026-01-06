-- Phase One RLS policies matching current app access patterns.
-- Note: Policies are created only if absent to avoid duplication with earlier migrations.

-- Helper to create policy if it does not exist
-- Usage: select create_policy_if_not_exists('schema.table', 'policy_name', 'policy_sql');
create or replace function public.create_policy_if_not_exists(
  target_table regclass,
  policy_name text,
  policy_sql text
) returns void language plpgsql as $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = split_part(target_table::text, '.', 1)
      and tablename = split_part(target_table::text, '.', 2)
      and policyname = policy_name
  ) then
    execute policy_sql;
  end if;
end;
$$;

-- A) profiles
alter table if exists public.profiles enable row level security;
select public.create_policy_if_not_exists(
  'public.profiles',
  'profiles_select_own',
  $$create policy "profiles_select_own" on public.profiles for select using (id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.profiles',
  'profiles_insert_own',
  $$create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.profiles',
  'profiles_update_own',
  $$create policy "profiles_update_own" on public.profiles for update using (id = auth.uid())$$
);

-- B) characters
alter table if exists public.characters enable row level security;
select public.create_policy_if_not_exists(
  'public.characters',
  'characters_select_own',
  $$create policy "characters_select_own" on public.characters for select using (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.characters',
  'characters_insert_own',
  $$create policy "characters_insert_own" on public.characters for insert with check (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.characters',
  'characters_update_own',
  $$create policy "characters_update_own" on public.characters for update using (user_id = auth.uid())$$
);

-- C) daily_states
alter table if exists public.daily_states enable row level security;
select public.create_policy_if_not_exists(
  'public.daily_states',
  'daily_states_select_own',
  $$create policy "daily_states_select_own" on public.daily_states for select using (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.daily_states',
  'daily_states_insert_own',
  $$create policy "daily_states_insert_own" on public.daily_states for insert with check (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.daily_states',
  'daily_states_update_own',
  $$create policy "daily_states_update_own" on public.daily_states for update using (user_id = auth.uid())$$
);

-- D) time_allocations
alter table if exists public.time_allocations enable row level security;
select public.create_policy_if_not_exists(
  'public.time_allocations',
  'time_allocations_select_own',
  $$create policy "time_allocations_select_own" on public.time_allocations for select using (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.time_allocations',
  'time_allocations_insert_own',
  $$create policy "time_allocations_insert_own" on public.time_allocations for insert with check (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.time_allocations',
  'time_allocations_update_own',
  $$create policy "time_allocations_update_own" on public.time_allocations for update using (user_id = auth.uid())$$
);

-- E) storylets
alter table if exists public.storylets enable row level security;
select public.create_policy_if_not_exists(
  'public.storylets',
  'storylets_select_active_public',
  $$create policy "storylets_select_active_public" on public.storylets for select using (is_active)$$
);
-- No write policies for storylets (managed by admin/service role).

-- F) storylet_runs
alter table if exists public.storylet_runs enable row level security;
select public.create_policy_if_not_exists(
  'public.storylet_runs',
  'storylet_runs_select_own',
  $$create policy "storylet_runs_select_own" on public.storylet_runs for select using (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.storylet_runs',
  'storylet_runs_insert_own',
  $$create policy "storylet_runs_insert_own" on public.storylet_runs for insert with check (user_id = auth.uid())$$
);
-- No update/delete needed currently.

-- G) public_profiles
alter table if exists public.public_profiles enable row level security;
select public.create_policy_if_not_exists(
  'public.public_profiles',
  'public_profiles_select_all',
  $$create policy "public_profiles_select_all" on public.public_profiles for select using (true)$$
);
select public.create_policy_if_not_exists(
  'public.public_profiles',
  'public_profiles_insert_own',
  $$create policy "public_profiles_insert_own" on public.public_profiles for insert with check (user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.public_profiles',
  'public_profiles_update_own',
  $$create policy "public_profiles_update_own" on public.public_profiles for update using (user_id = auth.uid())$$
);

-- H) social_actions
alter table if exists public.social_actions enable row level security;
select public.create_policy_if_not_exists(
  'public.social_actions',
  'social_actions_insert_from_self',
  $$create policy "social_actions_insert_from_self" on public.social_actions for insert with check (from_user_id = auth.uid())$$
);
select public.create_policy_if_not_exists(
  'public.social_actions',
  'social_actions_select_related',
  $$create policy "social_actions_select_related" on public.social_actions for select using (from_user_id = auth.uid() or to_user_id = auth.uid())$$
);

-- Cleanup helper function (optional; keep for idempotency in later runs)
drop function if exists public.create_policy_if_not_exists(regclass, text, text);
