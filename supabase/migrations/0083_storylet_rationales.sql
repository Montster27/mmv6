create table if not exists public.storylet_rationales (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storylet_id uuid not null references public.storylets(id) on delete cascade,
  choice_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists storylet_rationales_storylet_idx
  on public.storylet_rationales (storylet_id, created_at desc);
create index if not exists storylet_rationales_user_idx
  on public.storylet_rationales (user_id, created_at desc);

alter table public.storylet_rationales enable row level security;

do $$ begin
  begin
    create policy "storylet_rationales_select_cohort" on public.storylet_rationales
      for select using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = storylet_rationales.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "storylet_rationales_insert_own" on public.storylet_rationales
      for insert with check (
        user_id = auth.uid() and
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = storylet_rationales.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
