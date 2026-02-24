create table if not exists public.content_arc_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_key text not null references public.content_arcs(key) on delete cascade,
  status text not null default 'active',
  started_day_index integer not null,
  current_step integer not null default 0,
  meta jsonb,
  updated_at timestamptz not null default now()
);

alter table public.content_arc_instances enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_arc_instances'
      and policyname = 'content_arc_instances_select_own'
  ) then
    create policy "content_arc_instances_select_own" on public.content_arc_instances
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_arc_instances'
      and policyname = 'content_arc_instances_insert_own'
  ) then
    create policy "content_arc_instances_insert_own" on public.content_arc_instances
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_arc_instances'
      and policyname = 'content_arc_instances_update_own'
  ) then
    create policy "content_arc_instances_update_own" on public.content_arc_instances
      for update using (user_id = auth.uid());
  end if;
end $$;

create index if not exists content_arc_instances_user_id_idx
  on public.content_arc_instances (user_id);

create index if not exists content_arc_instances_arc_key_idx
  on public.content_arc_instances (arc_key);

create index if not exists content_arc_instances_status_idx
  on public.content_arc_instances (status);

create unique index if not exists content_arc_instances_user_arc_key_idx
  on public.content_arc_instances (user_id, arc_key);
