begin;
-- Template installation is one transaction. Each object still uses the canonical
-- workspace authorization, revision guard, draft-only rule and audit event.
create or replace function public.studio_save_batch(p_actor uuid, p_admin boolean, p_workspace uuid, p_revision integer, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare change jsonb; result jsonb; next_revision integer := p_revision;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 128 then
    raise exception 'A batch needs 1–128 changes';
  end if;
  for change in select value from jsonb_array_elements(p_changes) loop
    result := public.studio_command(p_actor,p_admin,'save',jsonb_build_object(
      'workspace_id',p_workspace,'revision',next_revision,
      'kind',change->>'kind','object_id',change->>'object_id','payload',change->'payload'));
    next_revision := (result->>'revision')::integer;
  end loop;
  return jsonb_build_object('id',p_workspace,'revision',next_revision);
end $$;
revoke all on function public.studio_save_batch(uuid,boolean,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.studio_save_batch(uuid,boolean,uuid,integer,jsonb) to service_role;
commit;
