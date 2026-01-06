-- Add metadata fields to storylets for selection/tuning.
-- Note: storylets already have is_active (canonical). We will NOT add a separate "active" column.

alter table public.storylets
  add column if not exists tags text[] not null default '{}',
  add column if not exists requirements jsonb not null default '{}'::jsonb,
  add column if not exists weight int not null default 100;

-- Indexes for future selection/tuning
create index if not exists storylets_tags_gin_idx on public.storylets using gin (tags);
create index if not exists storylets_is_active_idx on public.storylets (is_active);
create index if not exists storylets_weight_idx on public.storylets (weight);
