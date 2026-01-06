-- Phase One: daily reflections storage
create table if not exists public.reflections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    day_index int not null,
    prompt_id text not null default 'clarity_v1',
    response text,
    skipped boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.reflections
    add constraint reflections_user_day_unique unique (user_id, day_index);

create index if not exists reflections_user_day_idx on public.reflections (user_id, day_index);
