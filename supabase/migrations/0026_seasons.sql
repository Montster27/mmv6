-- Phase Two: seasons catalog
create table if not exists public.seasons (
    id uuid primary key default gen_random_uuid(),
    season_index int not null unique,
    starts_at date not null,
    ends_at date not null,
    created_at timestamptz not null default now()
);

insert into public.seasons (season_index, starts_at, ends_at)
values
  (1, current_date, current_date + interval '27 days'),
  (2, current_date + interval '28 days', current_date + interval '55 days')
on conflict (season_index) do nothing;
