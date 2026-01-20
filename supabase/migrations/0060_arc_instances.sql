do $$ begin
  if to_regclass('public.arc_instances') is null then
    create table public.arc_instances (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      arc_key text not null references public.content_arcs(key) on delete cascade,
      status text not null default 'active' check (status in ('active','completed','abandoned')),
      started_day_index int not null,
      current_step int not null default 0,
      updated_at timestamptz not null default now(),
      meta jsonb null,
      unique (user_id, arc_key)
    );
  end if;
end $$;

alter table public.arc_instances
  add column if not exists arc_key text;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arc_instances'
      and column_name = 'arc_id'
  ) then
    update public.arc_instances ai
      set arc_key = a.key
      from public.arcs a
      where ai.arc_id = a.id and ai.arc_key is null;
  end if;
end $$;

update public.arc_instances
  set arc_key = 'anomaly_001'
  where arc_key is null;

alter table public.arc_instances
  alter column user_id set not null,
  alter column arc_key set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.arc_instances
  drop constraint if exists arc_instances_user_id_arc_id_key;

alter table public.arc_instances
  drop constraint if exists arc_instances_user_id_arc_key;

alter table public.arc_instances
  add constraint arc_instances_user_id_arc_key unique (user_id, arc_key);

alter table public.arc_instances
  drop constraint if exists arc_instances_arc_key_fkey;

alter table public.arc_instances
  add constraint arc_instances_arc_key_fkey
    foreign key (arc_key) references public.content_arcs(key) on delete cascade;

alter table public.arc_instances
  drop column if exists arc_id;

create index if not exists arc_instances_user_id_idx
  on public.arc_instances (user_id);

create index if not exists arc_instances_arc_key_idx
  on public.arc_instances (arc_key);

create index if not exists arc_instances_status_idx
  on public.arc_instances (status);

do $$ begin
  if to_regclass('public.arc_instances') is null then
    return;
  end if;

  alter table public.arc_instances enable row level security;

  begin
    create policy "arc_instances_select_own" on public.arc_instances
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "arc_instances_insert_own" on public.arc_instances
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "arc_instances_update_own" on public.arc_instances
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
