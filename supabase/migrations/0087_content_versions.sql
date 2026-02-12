create table if not exists public.content_versions (
  version_id uuid primary key default gen_random_uuid(),
  state text not null check (state in ('draft','published','archived')),
  snapshot jsonb not null,
  note text not null,
  author text null,
  created_at timestamptz not null default now()
);

alter table public.content_versions enable row level security;
