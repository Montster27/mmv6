-- RLS for user_seasons
do $$ begin
  if to_regclass('public.user_seasons') is null then
    return;
  end if;

  alter table public.user_seasons enable row level security;

  begin
    create policy "user_seasons_select_own" on public.user_seasons
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "user_seasons_insert_own" on public.user_seasons
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "user_seasons_update_own" on public.user_seasons
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
