create table if not exists public.content_arcs (
  key text primary key,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.content_arc_steps (
  arc_key text not null references public.content_arcs(key) on delete cascade,
  step_index integer not null,
  title text not null,
  body text not null,
  choices jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (arc_key, step_index)
);

create index if not exists content_arc_steps_arc_key_idx
  on public.content_arc_steps (arc_key);

create table if not exists public.content_initiatives (
  key text primary key,
  title text not null,
  description text not null default '',
  goal integer not null default 100,
  duration_days integer not null default 7,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$ begin
  if to_regclass('public.content_arcs') is null then
    return;
  end if;

  alter table public.content_arcs enable row level security;
  alter table public.content_arc_steps enable row level security;
  alter table public.content_initiatives enable row level security;

  begin
    create policy "content_arcs_select_authenticated" on public.content_arcs
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "content_arc_steps_select_authenticated" on public.content_arc_steps
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "content_initiatives_select_authenticated" on public.content_initiatives
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;
end $$;
