create table if not exists public.daily_tensions (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer not null,
  key text not null,
  severity integer not null,
  expires_day_index integer not null,
  resolved_at timestamptz null,
  meta jsonb null,
  primary key (user_id, day_index, key)
);

create index if not exists daily_tensions_user_id_idx
  on public.daily_tensions (user_id);

create index if not exists daily_tensions_day_index_idx
  on public.daily_tensions (day_index);

create table if not exists public.skill_bank (
  user_id uuid not null references auth.users(id) on delete cascade,
  available_points integer not null default 0,
  cap integer not null default 0,
  last_awarded_day_index integer null,
  primary key (user_id)
);

create table if not exists public.daily_posture (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer not null,
  posture text not null check (posture in ('push','steady','recover','connect')),
  created_at timestamptz not null default now(),
  primary key (user_id, day_index)
);

create index if not exists daily_posture_user_id_idx
  on public.daily_posture (user_id);

create index if not exists daily_posture_day_index_idx
  on public.daily_posture (day_index);
