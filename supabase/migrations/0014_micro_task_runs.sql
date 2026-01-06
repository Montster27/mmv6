-- Phase One: optional micro-task runs
create table if not exists public.micro_task_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    day_index int not null,
    task_id text not null default 'pattern_match_v1',
    status text not null,
    score int,
    duration_ms int,
    created_at timestamptz not null default now()
);

alter table public.micro_task_runs
    add constraint micro_task_runs_unique unique (user_id, day_index, task_id);

create index if not exists micro_task_runs_user_day_idx on public.micro_task_runs (user_id, day_index);
