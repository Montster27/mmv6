begin;

create table public.studio_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('writer','lead','reviewer','publisher')),
  display_name text not null default ''
);
create table public.studio_releases (
  id uuid primary key default gen_random_uuid(), title text not null,
  manifest jsonb not null, runtime_version text not null default 'narrative-offers-v1',
  source_workspace_id uuid, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.studio_active_release (
  singleton boolean primary key default true check (singleton),
  release_id uuid not null references public.studio_releases(id)
);
create table public.studio_run_releases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  release_id uuid not null references public.studio_releases(id), created_at timestamptz not null default now()
);
create table public.studio_workspaces (
  id uuid primary key default gen_random_uuid(), title text not null,
  owner_id uuid not null references auth.users(id), reviewer_id uuid references auth.users(id),
  collaborator_ids uuid[] not null default '{}', base_release_id uuid not null references public.studio_releases(id),
  revision integer not null default 1, status text not null default 'draft' check(status in ('draft','review','approved','published')),
  brief text not null default '', plan_id text, blocked_reason text not null default '',
  approved_by uuid references auth.users(id), approved_revision integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.studio_changes (
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  kind text not null check(kind in ('storylets','tracks','consequences','plans','definitions','scenarios')),
  object_id text not null, payload jsonb, primary key(workspace_id,kind,object_id)
);
create table public.studio_events (
  id bigint generated always as identity primary key, workspace_id uuid references public.studio_workspaces(id),
  actor_id uuid not null references auth.users(id), action text not null, revision integer,
  detail jsonb not null default '{}', created_at timestamptz not null default now()
);

-- Immutable baseline. Existing lives keep exactly the content present at migration time.
insert into public.studio_releases(title,manifest)
select 'Imported narrative baseline', jsonb_build_object(
  'storylets', coalesce((select jsonb_agg(to_jsonb(s)) from public.storylets s),'[]'::jsonb),
  'tracks', coalesce((select jsonb_agg(to_jsonb(t)) from public.tracks t),'[]'::jsonb),
  'consequences', coalesce((select jsonb_agg(to_jsonb(c)) from public.delayed_consequence_rules c),'[]'::jsonb),
  'plans','[]'::jsonb,'definitions','[]'::jsonb,'scenarios','[]'::jsonb
);
insert into public.studio_active_release(release_id) select id from public.studio_releases order by created_at limit 1;
insert into public.studio_run_releases(user_id,release_id)
select distinct d.user_id,a.release_id from public.daily_states d cross join public.studio_active_release a
where d.user_id is not null on conflict do nothing;

-- Authoring tables have no browser policies. All writes require server-side authorization.
alter table public.studio_members enable row level security;
alter table public.studio_releases enable row level security;
alter table public.studio_active_release enable row level security;
alter table public.studio_run_releases enable row level security;
alter table public.studio_workspaces enable row level security;
alter table public.studio_changes enable row level security;
alter table public.studio_events enable row level security;
revoke all on public.studio_members, public.studio_releases, public.studio_active_release, public.studio_run_releases,
  public.studio_workspaces, public.studio_changes, public.studio_events from anon, authenticated;
grant all on public.studio_members, public.studio_releases, public.studio_active_release, public.studio_run_releases,
  public.studio_workspaces, public.studio_changes, public.studio_events to service_role;
grant usage, select on sequence public.studio_events_id_seq to service_role;

create function public.studio_workspace_manifest(p_workspace uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb; item record; rows jsonb;
begin
  select r.manifest into result from studio_workspaces w join studio_releases r on r.id=w.base_release_id where w.id=p_workspace;
  if result is null then raise exception 'Workspace not found'; end if;
  for item in select * from studio_changes where workspace_id=p_workspace loop
    select coalesce(jsonb_agg(value),'[]'::jsonb) into rows from jsonb_array_elements(coalesce(result->item.kind,'[]'::jsonb))
      where coalesce(value->>'id',value->>'key') <> item.object_id;
    if item.payload is not null then rows := rows || jsonb_build_array(item.payload); end if;
    result := jsonb_set(result,array[item.kind],rows);
  end loop;
  return result;
end $$;

-- Preserve identity rows needed by existing foreign keys. Content reads use release manifests.
create function public.studio_materialize_identities(p_manifest jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare kind text; tbl text; row_data jsonb; cols text; identity_col text;
begin
  perform set_config('studio.materializing','on',true);
  foreach kind in array array['tracks','storylets','consequences'] loop
    tbl := case kind when 'consequences' then 'delayed_consequence_rules' else kind end;
    identity_col := case kind when 'consequences' then 'key' else 'id' end;
    for row_data in select value from jsonb_array_elements(p_manifest->kind) loop
      select string_agg(format('%I',c.column_name),',' order by c.ordinal_position) into cols
      from information_schema.columns c where c.table_schema='public' and c.table_name=tbl
        and row_data ? c.column_name and c.is_generated='NEVER';
      if cols is not null then
        execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict (%I) do nothing',tbl,cols,cols,tbl,identity_col) using row_data;
      end if;
    end loop;
  end loop;
  perform set_config('studio.materializing','off',true);
end $$;

-- All workspace changes and approvals share one row lock and compare-and-swap revision.
create function public.studio_command(p_actor uuid,p_admin boolean,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare w studio_workspaces; role_name text; manifest jsonb; current_release uuid; created_id uuid;
  next_status text; event_detail jsonb := p_data; can_edit boolean; assigned_owner uuid;
begin
  select role into role_name from studio_members where user_id=p_actor;
  if not p_admin and role_name is null then raise exception 'Studio membership required' using errcode='42501'; end if;
  if p_action='member' then
    if not p_admin then raise exception 'Administrator required' using errcode='42501'; end if;
    insert into studio_members(user_id,role,display_name) values((p_data->>'user_id')::uuid,p_data->>'role',coalesce(p_data->>'display_name',''))
    on conflict(user_id) do update set role=excluded.role,display_name=excluded.display_name;
    insert into studio_events(actor_id,action,detail) values(p_actor,p_action,p_data);
    return jsonb_build_object('ok',true);
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
    if w.status<>'draft' or w.reviewer_id is null or w.blocked_reason<>'' then raise exception 'Assign a reviewer and resolve blockers before submitting.'; end if;
    next_status := 'review';
  elsif p_action in ('approve','changes') then
    if not p_admin and w.reviewer_id is distinct from p_actor then raise exception 'Assigned reviewer required' using errcode='42501'; end if;
    if p_action='approve' then
      if w.status<>'review' then raise exception 'Only work in review can be approved'; end if;
      if not p_admin and role_name not in ('lead','reviewer','publisher') then raise exception 'Reviewer role required' using errcode='42501'; end if;
      if w.owner_id=p_actor or p_actor=any(w.collaborator_ids) then raise exception 'Independent review is required'; end if;
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
    insert into studio_releases(title,manifest,source_workspace_id,created_by)
      values(w.title,manifest,w.id,p_actor) returning id into created_id;
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

create function public.runtime_release_id(p_user_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare who uuid := coalesce(p_user_id,auth.uid()); result uuid;
begin
  if who is null or (auth.role()<>'service_role' and who is distinct from auth.uid()) then raise exception 'Not authorized' using errcode='42501'; end if;
  insert into studio_run_releases(user_id,release_id) select who,release_id from studio_active_release on conflict(user_id) do nothing;
  select release_id into result from studio_run_releases where user_id=who;
  return result;
end $$;
create function public.runtime_storylets(p_user_id uuid default null) returns setof public.storylets
language sql security definer set search_path=public as $$
  select s.* from studio_releases r cross join lateral jsonb_populate_recordset(null::public.storylets,r.manifest->'storylets') s where r.id=runtime_release_id(p_user_id);
$$;
create function public.runtime_tracks(p_user_id uuid default null) returns setof public.tracks
language sql security definer set search_path=public as $$
  select t.* from studio_releases r cross join lateral jsonb_populate_recordset(null::public.tracks,r.manifest->'tracks') t where r.id=runtime_release_id(p_user_id);
$$;
create function public.runtime_consequences(p_user_id uuid default null) returns setof public.delayed_consequence_rules
language sql security definer set search_path=public as $$
  select c.* from studio_releases r cross join lateral jsonb_populate_recordset(null::public.delayed_consequence_rules,r.manifest->'consequences') c where r.id=runtime_release_id(p_user_id);
$$;
revoke all on function public.studio_workspace_manifest(uuid),public.studio_materialize_identities(jsonb),public.studio_command(uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.studio_workspace_manifest(uuid),public.studio_materialize_identities(jsonb),public.studio_command(uuid,boolean,text,jsonb) to service_role;
revoke all on function public.runtime_release_id(uuid),public.runtime_storylets(uuid),public.runtime_tracks(uuid),public.runtime_consequences(uuid) from public,anon;
grant execute on function public.runtime_release_id(uuid),public.runtime_storylets(uuid),public.runtime_tracks(uuid),public.runtime_consequences(uuid) to authenticated,service_role;

-- Old browser builds must not bypass drafts by writing directly to live identity tables.
create function public.studio_guard_live_content() returns trigger
language plpgsql set search_path=public as $$
begin
  if current_setting('studio.materializing',true) is distinct from 'on' then
    raise exception 'Content is release managed. Save in a Studio draft workspace.' using errcode='42501';
  end if;
  return new;
end $$;
create trigger studio_guard_storylets before insert or update or delete on public.storylets for each row execute function public.studio_guard_live_content();
create trigger studio_guard_tracks before insert or update or delete on public.tracks for each row execute function public.studio_guard_live_content();
create trigger studio_guard_consequences before insert or update or delete on public.delayed_consequence_rules for each row execute function public.studio_guard_live_content();
revoke update,delete on public.studio_releases,public.studio_events from service_role;
commit;
