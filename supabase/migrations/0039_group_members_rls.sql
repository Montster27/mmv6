do $$ begin
  if to_regclass('public.group_members') is null then
    return;
  end if;

  alter table public.group_members enable row level security;

  begin
    create policy "group_members_select_member" on public.group_members
      for select using (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_members.group_id
            and gm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "group_members_insert_own" on public.group_members
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "group_members_delete_own" on public.group_members
      for delete using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
