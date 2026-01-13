do $$ begin
  if to_regclass('public.experiments') is null then
    return;
  end if;

  alter table public.experiments enable row level security;

  begin
    create policy "experiments_select_all" on public.experiments
      for select using (true);
  exception when duplicate_object then null; end;
end $$;
