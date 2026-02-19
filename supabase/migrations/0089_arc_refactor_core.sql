-- Arc-first core loop tables (offers, instances, logs, dispositions, summaries)

create table if not exists public.arc_definitions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  description text not null default '',
  tags jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.arc_steps (
  id uuid primary key default gen_random_uuid(),
  arc_id uuid not null references public.arc_definitions(id) on delete cascade,
  step_key text not null,
  order_index int not null,
  title text not null,
  body text not null,
  options jsonb not null default '[]'::jsonb,
  default_next_step_key text null,
  due_offset_days int not null default 0,
  expires_after_days int not null default 2,
  created_at timestamptz not null default now(),
  unique (arc_id, step_key)
);

create index if not exists arc_steps_arc_id_idx on public.arc_steps (arc_id);
create index if not exists arc_steps_order_idx on public.arc_steps (arc_id, order_index);

create table if not exists public.arc_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_id uuid not null references public.arc_definitions(id) on delete cascade,
  offer_key text not null,
  state text not null check (state in ('ACTIVE','ACCEPTED','EXPIRED','DISMISSED')),
  times_shown int not null default 0,
  tone_level int not null default 0,
  first_seen_day int not null,
  last_seen_day int not null,
  expires_on_day int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, arc_id, offer_key)
);

create index if not exists arc_offers_user_id_idx on public.arc_offers (user_id);
create index if not exists arc_offers_state_idx on public.arc_offers (state);

create table if not exists public.arc_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_id uuid not null references public.arc_definitions(id) on delete cascade,
  state text not null check (state in ('ACTIVE','COMPLETED','FAILED','ABANDONED')),
  current_step_key text not null,
  step_due_day int not null,
  step_defer_count int not null default 0,
  started_day int not null,
  updated_day int not null,
  completed_day int null,
  failure_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arc_instances_user_id_idx on public.arc_instances (user_id);
create index if not exists arc_instances_state_idx on public.arc_instances (state);

create table if not exists public.player_dispositions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  hesitation int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, tag)
);

create index if not exists player_dispositions_user_id_idx on public.player_dispositions (user_id);

create table if not exists public.choice_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null,
  event_type text not null,
  arc_id uuid null references public.arc_definitions(id) on delete set null,
  arc_instance_id uuid null references public.arc_instances(id) on delete set null,
  step_key text null,
  offer_id uuid null references public.arc_offers(id) on delete set null,
  option_key text null,
  delta jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists choice_log_user_id_idx on public.choice_log (user_id);
create index if not exists choice_log_day_idx on public.choice_log (user_id, day);

create table if not exists public.chapter_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_key text not null,
  day_end int not null,
  pillar_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chapter_summaries_user_id_idx on public.chapter_summaries (user_id);

-- RLS policies
alter table public.arc_definitions enable row level security;
alter table public.arc_steps enable row level security;
alter table public.arc_offers enable row level security;
alter table public.arc_instances enable row level security;
alter table public.player_dispositions enable row level security;
alter table public.choice_log enable row level security;
alter table public.chapter_summaries enable row level security;

do $$ begin
  begin
    create policy "arc_definitions_select_authenticated" on public.arc_definitions
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "arc_steps_select_authenticated" on public.arc_steps
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "arc_offers_select_own" on public.arc_offers
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "arc_offers_insert_own" on public.arc_offers
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "arc_offers_update_own" on public.arc_offers
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "arc_instances_select_own" on public.arc_instances
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "arc_instances_insert_own" on public.arc_instances
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "arc_instances_update_own" on public.arc_instances
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "player_dispositions_select_own" on public.player_dispositions
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "player_dispositions_insert_own" on public.player_dispositions
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "player_dispositions_update_own" on public.player_dispositions
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "choice_log_select_own" on public.choice_log
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "choice_log_insert_own" on public.choice_log
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "chapter_summaries_select_own" on public.chapter_summaries
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "chapter_summaries_insert_own" on public.chapter_summaries
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
