alter table public.storylets
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists storylets_set_updated_at on public.storylets;
create trigger storylets_set_updated_at
before update on public.storylets
for each row execute function public.set_updated_at();
