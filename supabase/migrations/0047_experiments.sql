create table if not exists public.experiments (
  id text primary key,
  description text not null default '',
  variants text[] not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

insert into public.experiments (id, description, variants, active)
values ('microtask_freq_v1', 'Micro-task frequency test', array['A','B'], true)
on conflict (id) do nothing;
