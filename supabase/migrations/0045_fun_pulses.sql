create table if not exists public.fun_pulses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  day_index int not null,
  season_index int not null,
  rating int null,
  skipped boolean not null default false,
  created_at timestamptz default now(),
  constraint fun_pulses_rating_check check (
    rating is null or (rating >= 1 and rating <= 5)
  )
);

create unique index if not exists fun_pulses_unique
  on public.fun_pulses (user_id, season_index, day_index);
