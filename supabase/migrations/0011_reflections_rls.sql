-- RLS for reflections table
alter table if exists public.reflections enable row level security;

do $$ begin
  create policy "reflections_select_own" on public.reflections for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reflections_insert_own" on public.reflections for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reflections_update_own" on public.reflections for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
