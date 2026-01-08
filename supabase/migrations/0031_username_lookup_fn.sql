-- Username lookup function for login
create or replace function public.lookup_email_by_username(u text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email
  from public.profiles
  where username_lower = lower(u)
  limit 1;
$$;

grant execute on function public.lookup_email_by_username(text) to anon;
grant execute on function public.lookup_email_by_username(text) to authenticated;
