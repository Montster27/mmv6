create table if not exists public.group_objective_weeks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  week_key text not null,
  objective_type text not null default 'stabilize_v1',
  target int not null default 100,
  progress int not null default 0,
  completed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists group_objective_weeks_unique
  on public.group_objective_weeks (group_id, week_key, objective_type);

create index if not exists group_objective_weeks_group_week_idx
  on public.group_objective_weeks (group_id, week_key);
