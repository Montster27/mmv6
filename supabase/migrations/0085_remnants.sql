create table if not exists public.remnant_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  remnant_key text not null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, remnant_key)
);

create table if not exists public.remnant_selections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remnant_key text not null,
  selected_at timestamptz not null default now(),
  active boolean not null default true,
  last_applied_day_index int null
);

alter table public.remnant_unlocks enable row level security;
alter table public.remnant_selections enable row level security;

do $$ begin
  begin
    create policy "remnant_unlocks_select_own" on public.remnant_unlocks
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "remnant_unlocks_insert_own" on public.remnant_unlocks
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "remnant_selections_select_own" on public.remnant_selections
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "remnant_selections_insert_own" on public.remnant_selections
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "remnant_selections_update_own" on public.remnant_selections
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
