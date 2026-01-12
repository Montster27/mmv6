do $$ begin
  if to_regclass('public.clue_messages') is null then
    return;
  end if;

  alter table public.clue_messages enable row level security;

  begin
    create policy "clue_messages_select_participants" on public.clue_messages
      for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "clue_messages_insert_member" on public.clue_messages
      for insert with check (
        from_user_id = auth.uid()
        and exists (
          select 1 from public.group_members gm_from
          where gm_from.group_id = clue_messages.group_id
            and gm_from.user_id = clue_messages.from_user_id
        )
        and exists (
          select 1 from public.group_members gm_to
          where gm_to.group_id = clue_messages.group_id
            and gm_to.user_id = clue_messages.to_user_id
        )
      );
  exception when duplicate_object then null; end;
end $$;
