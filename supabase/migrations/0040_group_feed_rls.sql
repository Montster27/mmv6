do $$ begin
  if to_regclass('public.group_feed') is null then
    return;
  end if;

  alter table public.group_feed enable row level security;

  begin
    create policy "group_feed_select_member" on public.group_feed
      for select using (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_feed.group_id
            and gm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "group_feed_insert_member" on public.group_feed
      for insert with check (
        exists (
          select 1 from public.group_members gm
          where gm.group_id = group_feed.group_id
            and gm.user_id = auth.uid()
        )
        and (actor_user_id is null or actor_user_id = auth.uid())
      );
  exception when duplicate_object then null; end;
end $$;
