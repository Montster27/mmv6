create table if not exists public.faction_directives (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  faction_key text references public.factions(key) on delete cascade,
  week_start_day_index int not null,
  week_end_day_index int not null,
  title text not null,
  description text not null,
  target_type text not null check (target_type in ('initiative','arc_unlock','signal')),
  target_key text null,
  status text not null default 'active' check (status in ('active','expired','completed')),
  created_at timestamptz default now(),
  unique (cohort_id, week_start_day_index)
);

create index if not exists faction_directives_cohort_id_idx
  on public.faction_directives (cohort_id);

do $$ begin
  if to_regclass('public.faction_directives') is null then
    return;
  end if;

  alter table public.faction_directives enable row level security;

  begin
    create policy "faction_directives_select_cohort" on public.faction_directives
      for select using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = faction_directives.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "faction_directives_insert_cohort" on public.faction_directives
      for insert with check (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = faction_directives.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "faction_directives_update_cohort" on public.faction_directives
      for update using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = faction_directives.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
