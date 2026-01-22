create table if not exists public.alignment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  day_index int not null,
  faction_key text references public.factions(key),
  delta int not null,
  source text not null,
  source_ref text null,
  created_at timestamptz default now()
);

create index if not exists alignment_events_user_id_idx
  on public.alignment_events (user_id);

create index if not exists alignment_events_faction_key_idx
  on public.alignment_events (faction_key);

do $$ begin
  if to_regclass('public.alignment_events') is null then
    return;
  end if;

  alter table public.alignment_events enable row level security;

  begin
    create policy "alignment_events_select_own" on public.alignment_events
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "alignment_events_insert_own" on public.alignment_events
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
