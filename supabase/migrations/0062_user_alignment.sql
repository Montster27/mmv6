create table if not exists public.user_alignment (
  user_id uuid references auth.users(id) on delete cascade,
  faction_key text references public.factions(key) on delete cascade,
  score int not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, faction_key)
);

do $$ begin
  if to_regclass('public.user_alignment') is null then
    return;
  end if;

  alter table public.user_alignment enable row level security;

  begin
    create policy "user_alignment_select_own" on public.user_alignment
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "user_alignment_insert_own" on public.user_alignment
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "user_alignment_update_own" on public.user_alignment
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
