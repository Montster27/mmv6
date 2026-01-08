-- Phase Two: hypotheses
create table if not exists public.hypotheses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    title text not null,
    body text not null default '',
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists hypotheses_user_updated_idx
  on public.hypotheses (user_id, updated_at desc);
