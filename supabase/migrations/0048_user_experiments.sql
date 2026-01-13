create table if not exists public.user_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  experiment_id text not null references public.experiments(id),
  variant text not null,
  assigned_at timestamptz default now(),
  override boolean not null default false
);

create unique index if not exists user_experiments_unique
  on public.user_experiments (user_id, experiment_id);
