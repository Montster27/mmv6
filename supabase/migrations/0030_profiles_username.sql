-- Add username fields to profiles
alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists username_lower text;

update public.profiles
  set username_lower = lower(username)
  where username is not null and username_lower is null;

do $$ begin
  alter table public.profiles
    add constraint profiles_username_lower_unique unique (username_lower);
exception when duplicate_object then null; end $$;

create index if not exists profiles_username_lower_idx
  on public.profiles (username_lower);
