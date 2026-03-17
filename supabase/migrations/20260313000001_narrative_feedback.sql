create table if not exists public.narrative_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storylet_id text not null,
  day_index integer,
  historically_accurate text not null,
  engagement text not null,
  emotional_resonance text not null,
  choice_quality text not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.narrative_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'narrative_feedback'
      and policyname = 'narrative_feedback_select_own'
  ) then
    create policy "narrative_feedback_select_own" on public.narrative_feedback
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'narrative_feedback'
      and policyname = 'narrative_feedback_insert_own'
  ) then
    create policy "narrative_feedback_insert_own" on public.narrative_feedback
      for insert with check (user_id = auth.uid());
  end if;
end $$;
