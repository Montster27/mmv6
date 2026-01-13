create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text null,
  created_at timestamptz default now(),
  status text not null default 'open'
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create index if not exists reports_target_idx
  on public.reports (target_type, target_id);
