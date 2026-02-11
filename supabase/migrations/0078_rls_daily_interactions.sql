do $$
begin
  if to_regclass('public.anomalies') is not null then
    alter table public.anomalies enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'anomalies'
        and policyname = 'anomalies_select_all'
    ) then
      create policy "anomalies_select_all" on public.anomalies
        for select using (auth.role() = 'authenticated');
    end if;
  end if;

  if to_regclass('public.daily_tensions') is not null then
    alter table public.daily_tensions enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_tensions'
        and policyname = 'daily_tensions_select_own'
    ) then
      create policy "daily_tensions_select_own" on public.daily_tensions
        for select using (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_tensions'
        and policyname = 'daily_tensions_insert_own'
    ) then
      create policy "daily_tensions_insert_own" on public.daily_tensions
        for insert with check (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_tensions'
        and policyname = 'daily_tensions_update_own'
    ) then
      create policy "daily_tensions_update_own" on public.daily_tensions
        for update using (user_id = auth.uid());
    end if;
  end if;

  if to_regclass('public.skill_bank') is not null then
    alter table public.skill_bank enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'skill_bank'
        and policyname = 'skill_bank_select_own'
    ) then
      create policy "skill_bank_select_own" on public.skill_bank
        for select using (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'skill_bank'
        and policyname = 'skill_bank_insert_own'
    ) then
      create policy "skill_bank_insert_own" on public.skill_bank
        for insert with check (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'skill_bank'
        and policyname = 'skill_bank_update_own'
    ) then
      create policy "skill_bank_update_own" on public.skill_bank
        for update using (user_id = auth.uid());
    end if;
  end if;

  if to_regclass('public.daily_posture') is not null then
    alter table public.daily_posture enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_posture'
        and policyname = 'daily_posture_select_own'
    ) then
      create policy "daily_posture_select_own" on public.daily_posture
        for select using (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_posture'
        and policyname = 'daily_posture_insert_own'
    ) then
      create policy "daily_posture_insert_own" on public.daily_posture
        for insert with check (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'daily_posture'
        and policyname = 'daily_posture_update_own'
    ) then
      create policy "daily_posture_update_own" on public.daily_posture
        for update using (user_id = auth.uid());
    end if;
  end if;

  if to_regclass('public.skill_point_allocations') is not null then
    alter table public.skill_point_allocations enable row level security;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'skill_point_allocations'
        and policyname = 'skill_point_allocations_select_own'
    ) then
      create policy "skill_point_allocations_select_own" on public.skill_point_allocations
        for select using (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'skill_point_allocations'
        and policyname = 'skill_point_allocations_insert_own'
    ) then
      create policy "skill_point_allocations_insert_own" on public.skill_point_allocations
        for insert with check (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'skill_point_allocations'
        and policyname = 'skill_point_allocations_update_own'
    ) then
      create policy "skill_point_allocations_update_own" on public.skill_point_allocations
        for update using (user_id = auth.uid());
    end if;
  end if;
end $$;
