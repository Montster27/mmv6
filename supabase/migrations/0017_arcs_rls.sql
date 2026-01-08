-- RLS for user_arcs table
alter table if exists public.user_arcs enable row level security;

do $$ begin
  create policy "user_arcs_select_own" on public.user_arcs for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_arcs_insert_own" on public.user_arcs for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_arcs_update_own" on public.user_arcs for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
