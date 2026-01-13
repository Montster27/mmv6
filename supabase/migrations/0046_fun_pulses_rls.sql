do $$ begin
  if to_regclass('public.fun_pulses') is null then
    return;
  end if;

  alter table public.fun_pulses enable row level security;

  begin
    create policy "fun_pulses_select_own" on public.fun_pulses
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "fun_pulses_insert_own" on public.fun_pulses
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "fun_pulses_update_own" on public.fun_pulses
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
