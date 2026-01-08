-- RLS for hypotheses
alter table if exists public.hypotheses enable row level security;

do $$ begin
  create policy "hypotheses_select_own" on public.hypotheses for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "hypotheses_insert_own" on public.hypotheses for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "hypotheses_update_own" on public.hypotheses for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "hypotheses_delete_own" on public.hypotheses for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
