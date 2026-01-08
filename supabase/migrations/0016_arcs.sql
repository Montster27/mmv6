-- Phase Two: user arcs progress
create table if not exists public.user_arcs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    arc_id text not null,
    status text not null default 'active',
    step_index int not null default 0,
    started_day_index int not null,
    last_advanced_day_index int,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_arcs
  add constraint user_arcs_unique unique (user_id, arc_id);

create index if not exists user_arcs_user_id_idx on public.user_arcs (user_id);
create index if not exists user_arcs_arc_id_idx on public.user_arcs (arc_id);
