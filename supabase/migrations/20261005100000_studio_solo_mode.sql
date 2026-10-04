-- Solo mode: a one-person team can write, approve and publish without a second reviewer.
-- Safeguards: only an administrator can enable it, it only works while the team has fewer
-- than two members, it switches itself off when a second member is added, and every
-- self-approved release is permanently marked self_reviewed.
begin;

create table public.studio_settings (
  singleton boolean primary key default true check (singleton),
  solo_mode boolean not null default false
);
insert into public.studio_settings(singleton) values (true);
alter table public.studio_settings enable row level security;
revoke all on public.studio_settings from anon, authenticated;
grant all on public.studio_settings to service_role;

alter table public.studio_releases add column self_reviewed boolean not null default false;

create or replace function public.studio_command(p_actor uuid,p_admin boolean,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare w studio_workspaces; role_name text; manifest jsonb; current_release uuid; created_id uuid;
  next_status text; event_detail jsonb := p_data; can_edit boolean; assigned_owner uuid; solo boolean;
begin
  select coalesce(solo_mode,false) into solo from studio_settings;
  solo := coalesce(solo,false);
  select role into role_name from studio_members where user_id=p_actor;
  if not p_admin and role_name is null then raise exception 'Studio membership required' using errcode='42501'; end if;
  if p_action='member' then
    if not p_admin then raise exception 'Administrator required' using errcode='42501'; end if;
    insert into studio_members(user_id,role,display_name) values((p_data->>'user_id')::uuid,p_data->>'role',coalesce(p_data->>'display_name',''))
    on conflict(user_id) do update set role=excluded.role,display_name=excluded.display_name;
    -- A second member means independent review is possible again.
    if (select count(*) from studio_members)>=2 then update studio_settings set solo_mode=false where singleton; end if;
    insert into studio_events(actor_id,action,detail) values(p_actor,p_action,p_data);
    return jsonb_build_object('ok',true);
  end if;
  if p_action='solo' then
    if not p_admin then raise exception 'Administrator required' using errcode='42501'; end if;
    if coalesce((p_data->>'enabled')::boolean,false) and (select count(*) from studio_members)>=2 then
      raise exception 'Solo mode is only for a one-person team. Remove other members or ask a second person to review.';
    end if;
    update studio_settings set solo_mode=coalesce((p_data->>'enabled')::boolean,false) where singleton;
    insert into studio_events(actor_id,action,detail) values(p_actor,p_action,p_data);
    return jsonb_build_object('ok',true,'solo_mode',coalesce((p_data->>'enabled')::boolean,false));
  end if;
  if p_action='create' then
    if length(trim(coalesce(p_data->>'title','')))=0 then raise exception 'Title required'; end if;
    assigned_owner := coalesce(nullif(p_data->>'owner_id','')::uuid,p_actor);
    if assigned_owner<>p_actor and not p_admin and role_name<>'lead' then raise exception 'A lead must assign work to another writer' using errcode='42501'; end if;
    select release_id into current_release from studio_active_release;
    insert into studio_workspaces(title,owner_id,reviewer_id,base_release_id,brief,plan_id)
    values(p_data->>'title',assigned_owner,nullif(p_data->>'reviewer_id','')::uuid,current_release,coalesce(p_data->>'brief',''),nullif(p_data->>'plan_id','')) returning id into created_id;
    insert into studio_events(workspace_id,actor_id,action,revision,detail) values(created_id,p_actor,'create',1,p_data);
    return jsonb_build_object('id',created_id,'revision',1);
  end if;
  if p_action='activate' then
    if not p_admin and role_name<>'publisher' then raise exception 'Publisher required' using errcode='42501'; end if;
    perform 1 from studio_releases where id=(p_data->>'release_id')::uuid and runtime_version='narrative-offers-v1';
    if not found then raise exception 'Compatible release not found'; end if;
    update studio_active_release set release_id=(p_data->>'release_id')::uuid;
    insert into studio_events(actor_id,action,detail) values(p_actor,p_action,p_data);
    return jsonb_build_object('ok',true);
  end if;
  select * into w from studio_workspaces where id=(p_data->>'workspace_id')::uuid for update;
  if w.id is null then raise exception 'Workspace not found'; end if;
  can_edit := p_admin or w.owner_id=p_actor or p_actor=any(w.collaborator_ids);
  if p_action='comment' then
    if length(trim(coalesce(p_data->>'text','')))=0 then raise exception 'Comment required'; end if;
    insert into studio_events(workspace_id,actor_id,action,revision,detail) values(w.id,p_actor,p_action,w.revision,p_data);
    return jsonb_build_object('revision',w.revision);
  end if;
  if (p_data->>'revision') is null or (p_data->>'revision')::integer<>w.revision then
    raise exception 'Revision conflict. Your work is preserved; reload and compare before saving.' using errcode='40001';
  end if;
  if w.status='published' then raise exception 'Published work is immutable. Create a new workspace.'; end if;
  if p_action in ('save','meta','rebase','submit') and not can_edit then raise exception 'Workspace owner or contributor required' using errcode='42501'; end if;
  if p_action='save' then
    if w.status<>'draft' then raise exception 'Return this workspace to draft before editing.'; end if;
    if not (p_data->>'kind'=any(array['storylets','tracks','consequences','plans','definitions','scenarios'])) then raise exception 'Invalid content kind'; end if;
    if coalesce(p_data->>'object_id','')='' then raise exception 'Identity required'; end if;
    if p_data->'payload' is distinct from 'null'::jsonb and p_data->'payload' is not null and coalesce(p_data->'payload'->>'id',p_data->'payload'->>'key','')<>p_data->>'object_id' then raise exception 'Payload identity must match the edited object'; end if;
    insert into studio_changes(workspace_id,kind,object_id,payload)
    values(w.id,p_data->>'kind',p_data->>'object_id',nullif(p_data->'payload','null'::jsonb))
    on conflict(workspace_id,kind,object_id) do update set payload=excluded.payload;
    next_status := 'draft';
  elsif p_action='meta' then
    if w.status<>'draft' then raise exception 'Return to draft before changing the assignment.'; end if;
    if not p_admin and w.owner_id<>p_actor then raise exception 'Owner required to assign collaborators'; end if;
    update studio_workspaces set title=coalesce(p_data->>'title',title),brief=coalesce(p_data->>'brief',brief),
      reviewer_id=nullif(p_data->>'reviewer_id','')::uuid,
      collaborator_ids=array(select jsonb_array_elements_text(coalesce(p_data->'collaborator_ids','[]'::jsonb))::uuid),
      plan_id=nullif(p_data->>'plan_id',''),blocked_reason=coalesce(p_data->>'blocked_reason','') where id=w.id;
    next_status := 'draft';
  elsif p_action='rebase' then
    select release_id into current_release from studio_active_release for update;
    if current_release<>(p_data->>'release_id')::uuid then raise exception 'Release changed; compare again' using errcode='40001'; end if;
    delete from studio_changes c where c.workspace_id=w.id and exists (
      select 1 from jsonb_array_elements(coalesce(p_data->'discard_changes','[]'::jsonb)) d
      where d->>'kind'=c.kind and d->>'object_id'=c.object_id
    );
    update studio_workspaces set base_release_id=current_release where id=w.id;
    next_status := 'draft';
  elsif p_action='submit' then
    if w.status<>'draft' or (w.reviewer_id is null and not solo) or w.blocked_reason<>'' then raise exception 'Assign a reviewer and resolve blockers before submitting.'; end if;
    next_status := 'review';
  elsif p_action in ('approve','changes') then
    if not p_admin and w.reviewer_id is distinct from p_actor then raise exception 'Assigned reviewer required' using errcode='42501'; end if;
    if p_action='approve' then
      if w.status<>'review' then raise exception 'Only work in review can be approved'; end if;
      if not p_admin and role_name not in ('lead','reviewer','publisher') then raise exception 'Reviewer role required' using errcode='42501'; end if;
      if w.owner_id=p_actor or p_actor=any(w.collaborator_ids) then
        -- Solo mode lets the only administrator approve their own work; the release is marked self-reviewed.
        if not (solo and p_admin) then raise exception 'Independent review is required'; end if;
        event_detail := p_data || jsonb_build_object('self_reviewed',true);
      end if;
      next_status := 'approved';
    else next_status := 'draft'; end if;
  elsif p_action='withdraw' then
    if not can_edit then raise exception 'Owner or contributor required' using errcode='42501'; end if;
    next_status := 'draft';
  elsif p_action='publish' then
    if not p_admin and role_name<>'publisher' then raise exception 'Publisher required' using errcode='42501'; end if;
    if w.status<>'approved' or w.approved_revision<>w.revision then raise exception 'Exact revision approval required'; end if;
    select release_id into current_release from studio_active_release for update;
    if current_release<>w.base_release_id then raise exception 'Baseline changed; rebase and review before publication' using errcode='40001'; end if;
    manifest := studio_workspace_manifest(w.id);
    perform studio_materialize_identities(manifest);
    insert into studio_releases(title,manifest,source_workspace_id,created_by,self_reviewed)
      values(w.title,manifest,w.id,p_actor,
        w.approved_by is not null and (w.approved_by=w.owner_id or w.approved_by=any(w.collaborator_ids))) returning id into created_id;
    update studio_active_release set release_id=created_id;
    next_status := 'published';
    event_detail := p_data || jsonb_build_object('release_id',created_id);
  else raise exception 'Unknown Studio command'; end if;
  update studio_workspaces set revision=revision+1,status=next_status,updated_at=now(),
    approved_by=case when next_status='approved' then p_actor else null end,
    approved_revision=case when next_status='approved' then revision+1 else null end where id=w.id;
  insert into studio_events(workspace_id,actor_id,action,revision,detail) values(w.id,p_actor,p_action,w.revision+1,event_detail);
  return jsonb_build_object('revision',w.revision+1,'release_id',created_id);
end $$;

commit;
