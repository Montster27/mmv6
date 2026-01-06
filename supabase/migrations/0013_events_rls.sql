-- RLS for events table
alter table if exists public.events enable row level security;

do $$ begin
  create policy "events_select_own" on public.events for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "events_insert_own" on public.events for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
