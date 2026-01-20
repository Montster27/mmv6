create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text null,
  is_active boolean default true
);

create table if not exists public.cohort_members (
  cohort_id uuid references public.cohorts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  role text default 'member',
  primary key (cohort_id, user_id)
);

create index if not exists cohort_members_user_id_idx
  on public.cohort_members (user_id);

create table if not exists public.arcs (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  title text,
  description text,
  created_at timestamptz default now(),
  is_active boolean default true,
  meta jsonb null
);

create table if not exists public.arc_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  arc_id uuid references public.arcs(id) on delete cascade,
  status text check (status in ('active','completed','abandoned')),
  started_day_index int not null,
  current_step int not null default 0,
  updated_at timestamptz default now(),
  meta jsonb null,
  unique (user_id, arc_id)
);

insert into public.arcs (key, title, description, is_active)
values ('anomaly_001', 'Anomaly 001', 'A three-beat investigation.', true)
on conflict (key) do nothing;

create table if not exists public.initiatives (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  key text,
  title text,
  description text,
  created_at timestamptz default now(),
  starts_day_index int not null,
  ends_day_index int not null,
  status text check (status in ('open','closed')) default 'open',
  goal int not null default 100,
  meta jsonb null,
  unique (cohort_id, key)
);

create table if not exists public.initiative_contributions (
  initiative_id uuid references public.initiatives(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  day_index int not null,
  amount int not null default 1,
  created_at timestamptz default now(),
  primary key (initiative_id, user_id, day_index)
);
