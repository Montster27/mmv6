with arc_identity as (
  select
    id,
    key,
    case key
      when 'arc_find_your_people' then '["people","risk"]'::jsonb
      when 'arc_romantic_risk' then '["people","risk"]'::jsonb
      when 'arc_academic_shock' then '["achievement"]'::jsonb
      when 'arc_study_group' then '["achievement"]'::jsonb
      else '["achievement"]'::jsonb
    end as identity_tags
  from public.arc_definitions
  where key in (
    'arc_find_your_people',
    'arc_romantic_risk',
    'arc_academic_shock',
    'arc_study_group'
  )
)
update public.arc_steps as steps
set options = (
  select jsonb_agg(
    jsonb_strip_nulls(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              option,
              '{time_cost}',
              case
                when option ? 'time_cost' then option->'time_cost'
                else '1'::jsonb
              end,
              true
            ),
            '{energy_cost}',
            case
              when option ? 'energy_cost' then option->'energy_cost'
              when (option->'costs'->'resources'->'energy') is not null then
                to_jsonb(abs((option->'costs'->'resources'->>'energy')::int))
              else '0'::jsonb
            end,
            true
          ),
          '{identity_tags}',
          case
            when option ? 'identity_tags' then option->'identity_tags'
            else arc_identity.identity_tags
          end,
          true
        ),
        '{money_requirement}',
        case
          when option ? 'money_requirement' then option->'money_requirement'
          when (option->'costs'->'resources'->'cashOnHand') is not null then
            '"okay"'::jsonb
          else option->'money_requirement'
        end,
        true
      )
    )
  )
  from jsonb_array_elements(steps.options) option
)
from arc_identity
where steps.arc_id = arc_identity.id;
