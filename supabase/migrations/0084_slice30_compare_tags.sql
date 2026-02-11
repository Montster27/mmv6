update public.storylets
set tags = array(select distinct unnest(tags || array['compare']))
where slug in ('slice30_core_focus', 'slice30_social_family');
