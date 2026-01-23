create table if not exists public.cohort_alignment_weekly (
  cohort_id uuid references public.cohorts(id) on delete cascade,
  week_start_day_index int not null,
  week_end_day_index int not null,
  influence jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  primary key (cohort_id, week_start_day_index)
);

do $$ begin
  if to_regclass('public.cohort_alignment_weekly') is null then
    return;
  end if;

  alter table public.cohort_alignment_weekly enable row level security;

  begin
    create policy "cohort_alignment_weekly_select_cohort" on public.cohort_alignment_weekly
      for select using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = cohort_alignment_weekly.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_alignment_weekly_insert_cohort" on public.cohort_alignment_weekly
      for insert with check (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = cohort_alignment_weekly.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
