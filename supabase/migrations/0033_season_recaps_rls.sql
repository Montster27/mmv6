-- RLS for season_recaps
do $$ begin
  if to_regclass('public.season_recaps') is null then
    return;
  end if;

  alter table public.season_recaps enable row level security;

  begin
    create policy "season_recaps_select_own" on public.season_recaps
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "season_recaps_insert_own" on public.season_recaps
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
