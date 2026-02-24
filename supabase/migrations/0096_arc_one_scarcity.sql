alter table public.daily_states
  add column if not exists life_pressure_state jsonb not null default '{}'::jsonb,
  add column if not exists energy_level text not null default 'high',
  add column if not exists money_band text not null default 'okay',
  add column if not exists skill_flags jsonb not null default '{}'::jsonb,
  add column if not exists npc_memory jsonb not null default '{}'::jsonb,
  add column if not exists expired_opportunities jsonb not null default '[]'::jsonb,
  add column if not exists replay_intention jsonb not null default '{}'::jsonb,
  add column if not exists arc_one_reflection_done boolean not null default false;

create table if not exists public.tester_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer,
  context jsonb,
  message text,
  created_at timestamptz not null default now()
);

alter table public.tester_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tester_feedback'
      and policyname = 'tester_feedback_select_own'
  ) then
    create policy "tester_feedback_select_own" on public.tester_feedback
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tester_feedback'
      and policyname = 'tester_feedback_insert_own'
  ) then
    create policy "tester_feedback_insert_own" on public.tester_feedback
      for insert with check (user_id = auth.uid());
  end if;
end $$;
