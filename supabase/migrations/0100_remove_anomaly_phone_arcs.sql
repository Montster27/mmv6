-- Remove anomaly_001 and intro_phone_on_hall content arcs/definitions/steps

with target_arcs as (
  select id from public.arc_definitions where key in ('anomaly_001', 'intro_phone_on_hall')
)
update public.arc_instances
set state = 'abandoned'
where arc_id in (select id from target_arcs);

delete from public.content_arc_steps
where arc_key in ('anomaly_001', 'intro_phone_on_hall');

delete from public.content_arcs
where key in ('anomaly_001', 'intro_phone_on_hall');

delete from public.arc_steps
where arc_id in (
  select id from public.arc_definitions where key in ('anomaly_001', 'intro_phone_on_hall')
);

delete from public.arc_definitions
where key in ('anomaly_001', 'intro_phone_on_hall');
