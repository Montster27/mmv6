do $$ begin
  if to_regclass('public.group_members') is null then
    return;
  end if;

  begin
    drop policy if exists "group_members_select_member" on public.group_members;
  exception when undefined_object then null; end;

  begin
    create policy "group_members_select_own" on public.group_members
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
