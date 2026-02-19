alter table public.arc_instances
  add column if not exists branch_key text;
