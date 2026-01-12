do $$ begin
  if to_regclass('public.groups') is null then
    return;
  end if;

  alter table public.groups enable row level security;

  begin
    create policy "groups_select_member" on public.groups
      for select using (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = groups.id
            and gm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "groups_insert_owner" on public.groups
      for insert with check (created_by = auth.uid());
  exception when duplicate_object then null; end;
end $$;
