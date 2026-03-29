-- Skill Web: player skill state and composite cache
-- Replaces the old 4-flag skill system (focus/memory/networking/grit)

-- Player base skill levels and progress
create table if not exists public.player_skill_web (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  level int not null default 0 check (level between 0 and 3),
  progress int not null default 0 check (progress >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

-- Composite skill cache (derived from base skills)
create table if not exists public.player_composites (
  user_id uuid not null references auth.users(id) on delete cascade,
  composite_id text not null,
  level int not null default 0 check (level between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, composite_id)
);

-- RLS
alter table public.player_skill_web enable row level security;

create policy "skill_web_select" on public.player_skill_web
  for select using (auth.uid() = user_id);

create policy "skill_web_insert" on public.player_skill_web
  for insert with check (auth.uid() = user_id);

create policy "skill_web_update" on public.player_skill_web
  for update using (auth.uid() = user_id);

alter table public.player_composites enable row level security;

create policy "composites_select" on public.player_composites
  for select using (auth.uid() = user_id);

create policy "composites_insert" on public.player_composites
  for insert with check (auth.uid() = user_id);

create policy "composites_update" on public.player_composites
  for update using (auth.uid() = user_id);
