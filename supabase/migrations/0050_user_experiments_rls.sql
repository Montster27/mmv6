do $$ begin
  if to_regclass('public.user_experiments') is null then
    return;
  end if;

  alter table public.user_experiments enable row level security;

  begin
    create policy "user_experiments_select_own" on public.user_experiments
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
