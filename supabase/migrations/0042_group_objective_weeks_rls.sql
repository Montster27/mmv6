do $$ begin
  if to_regclass('public.group_objective_weeks') is null then
    return;
  end if;

  alter table public.group_objective_weeks enable row level security;

  begin
    create policy "group_objective_select_member" on public.group_objective_weeks
      for select using (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_objective_weeks.group_id
            and gm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "group_objective_insert_member" on public.group_objective_weeks
      for insert with check (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_objective_weeks.group_id
            and gm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "group_objective_update_member" on public.group_objective_weeks
      for update using (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_objective_weeks.group_id
            and gm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
