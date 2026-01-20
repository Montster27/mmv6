do $$ begin
  if to_regclass('public.cohorts') is null then
    return;
  end if;

  alter table public.cohorts enable row level security;
  alter table public.cohort_members enable row level security;
  alter table public.arcs enable row level security;
  alter table public.arc_instances enable row level security;
  alter table public.initiatives enable row level security;
  alter table public.initiative_contributions enable row level security;

  begin
    create policy "cohorts_select_authenticated" on public.cohorts
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "cohorts_insert_authenticated" on public.cohorts
      for insert with check (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_members_select_own" on public.cohort_members
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_members_insert_own" on public.cohort_members
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "arcs_select_authenticated" on public.arcs
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;

  begin
    create policy "arc_instances_select_own" on public.arc_instances
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "arc_instances_insert_own" on public.arc_instances
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "arc_instances_update_own" on public.arc_instances
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "initiatives_select_cohort" on public.initiatives
      for select using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = initiatives.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "initiatives_insert_cohort" on public.initiatives
      for insert with check (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = initiatives.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "initiative_contributions_select_own" on public.initiative_contributions
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "initiative_contributions_insert_own" on public.initiative_contributions
      for insert with check (
        user_id = auth.uid() and
        exists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cm.cohort_id = i.cohort_id
          where i.id = initiative_contributions.initiative_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
