create table if not exists public.skill_point_allocations (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer not null,
  skill_key text not null,
  points integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, day_index, skill_key)
);

create index if not exists skill_point_allocations_user_day_idx
  on public.skill_point_allocations (user_id, day_index);
