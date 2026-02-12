create table if not exists public.delayed_consequence_rules (
  key text primary key,
  trigger jsonb not null default '{}'::jsonb,
  resolve jsonb not null default '{}'::jsonb,
  timing jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text null
);

alter table public.delayed_consequence_rules enable row level security;

create table if not exists public.remnant_rules (
  remnant_key text primary key,
  discovery jsonb not null default '{}'::jsonb,
  unlock jsonb not null default '{}'::jsonb,
  caps jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text null
);

alter table public.remnant_rules enable row level security;
