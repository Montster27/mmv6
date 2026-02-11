do $$ begin
  if to_regclass('public.cohort_members') is null then
    return;
  end if;

  begin
    create policy "cohort_members_select_cohort" on public.cohort_members
      for select using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = cohort_members.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
