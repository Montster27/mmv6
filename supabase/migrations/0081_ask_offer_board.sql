create table if not exists public.cohort_posts (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null check (post_type in ('ask','offer')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists cohort_posts_cohort_created_idx
  on public.cohort_posts (cohort_id, created_at desc);
create index if not exists cohort_posts_user_created_idx
  on public.cohort_posts (user_id, created_at desc);

create table if not exists public.cohort_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cohort_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_key text not null,
  body text null,
  created_at timestamptz not null default now()
);

create index if not exists cohort_post_replies_post_created_idx
  on public.cohort_post_replies (post_id, created_at asc);

create table if not exists public.cohort_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cohort_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'helpful',
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction)
);

create index if not exists cohort_post_reactions_post_idx
  on public.cohort_post_reactions (post_id);

alter table public.cohort_posts enable row level security;
alter table public.cohort_post_replies enable row level security;
alter table public.cohort_post_reactions enable row level security;

do $$ begin
  begin
    create policy "cohort_posts_select_cohort" on public.cohort_posts
      for select using (
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = cohort_posts.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_posts_insert_own" on public.cohort_posts
      for insert with check (
        user_id = auth.uid() and
        exists (
          select 1 from public.cohort_members cm
          where cm.cohort_id = cohort_posts.cohort_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_post_replies_select_cohort" on public.cohort_post_replies
      for select using (
        exists (
          select 1 from public.cohort_posts p
          join public.cohort_members cm on cm.cohort_id = p.cohort_id
          where p.id = cohort_post_replies.post_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_post_replies_insert_own" on public.cohort_post_replies
      for insert with check (
        user_id = auth.uid() and
        exists (
          select 1 from public.cohort_posts p
          join public.cohort_members cm on cm.cohort_id = p.cohort_id
          where p.id = cohort_post_replies.post_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_post_reactions_select_cohort" on public.cohort_post_reactions
      for select using (
        exists (
          select 1 from public.cohort_posts p
          join public.cohort_members cm on cm.cohort_id = p.cohort_id
          where p.id = cohort_post_reactions.post_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "cohort_post_reactions_insert_own" on public.cohort_post_reactions
      for insert with check (
        user_id = auth.uid() and
        exists (
          select 1 from public.cohort_posts p
          join public.cohort_members cm on cm.cohort_id = p.cohort_id
          where p.id = cohort_post_reactions.post_id
            and cm.user_id = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end $$;
