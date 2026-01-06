-- RLS for micro_task_runs table
alter table if exists public.micro_task_runs enable row level security;

do $$ begin
  create policy "micro_task_runs_select_own" on public.micro_task_runs for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "micro_task_runs_insert_own" on public.micro_task_runs for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "micro_task_runs_update_own" on public.micro_task_runs for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
