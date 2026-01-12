create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create unique index if not exists groups_join_code_key on public.groups (join_code);
