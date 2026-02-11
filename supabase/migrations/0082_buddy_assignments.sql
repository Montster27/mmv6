create table if not exists public.buddy_assignments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  buddy_user_id uuid null references auth.users(id) on delete set null,
  buddy_type text not null check (buddy_type in ('human','ai')),
  created_at timestamptz not null default now()
);

alter table public.buddy_assignments enable row level security;

do $$ begin
  begin
    create policy "buddy_assignments_select_own" on public.buddy_assignments
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "buddy_assignments_insert_own" on public.buddy_assignments
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy "buddy_assignments_update_own" on public.buddy_assignments
      for update using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;
