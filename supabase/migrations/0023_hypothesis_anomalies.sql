-- Phase Two: hypothesis anomaly links
create table if not exists public.hypothesis_anomalies (
    id uuid primary key default gen_random_uuid(),
    hypothesis_id uuid not null references public.hypotheses (id) on delete cascade,
    anomaly_id text not null references public.anomalies (id) on delete cascade
);

alter table public.hypothesis_anomalies
  add constraint hypothesis_anomalies_unique unique (hypothesis_id, anomaly_id);

create index if not exists hypothesis_anomalies_hypothesis_idx
  on public.hypothesis_anomalies (hypothesis_id);
create index if not exists hypothesis_anomalies_anomaly_idx
  on public.hypothesis_anomalies (anomaly_id);
