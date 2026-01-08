-- RLS for seasons catalog
do $$ begin
  if to_regclass('public.seasons') is null then
    return;
  end if;

  alter table public.seasons enable row level security;

  begin
    create policy "seasons_select_all" on public.seasons
      for select using (true);
  exception when duplicate_object then null; end;
end $$;
