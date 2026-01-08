-- Phase Two: user anomaly discoveries
create table if not exists public.user_anomalies (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    anomaly_id text not null references public.anomalies (id) on delete cascade,
    day_index int not null,
    discovered_at timestamptz not null default now(),
    source text
);

alter table public.user_anomalies
  add constraint user_anomalies_unique unique (user_id, anomaly_id);

create index if not exists user_anomalies_user_discovered_idx
  on public.user_anomalies (user_id, discovered_at desc);
create index if not exists user_anomalies_user_day_idx
  on public.user_anomalies (user_id, day_index);
