-- Seed arc-first test content: "The Study Group"

insert into public.arc_definitions (key, title, description, tags, is_enabled)
values
  (
    'arc_study_group',
    'The Study Group',
    'A low-stakes invitation that tests consistency and social friction.',
    '["Belonging","Courage"]'::jsonb,
    true
  )
on conflict (key) do update
  set title = excluded.title,
      description = excluded.description,
      tags = excluded.tags,
      is_enabled = excluded.is_enabled;

with arc as (
  select id from public.arc_definitions where key = 'arc_study_group'
)
insert into public.arc_steps (
  arc_id,
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
select arc.id, *
from arc
cross join (
  values
    (
      'step_1',
      0,
      'The Flyer on the Board',
      'A bright flyer promises a study group tonight. It feels harmless, but it asks for your time.',
      '[
        {
          "option_key":"accept_invite",
          "label":"Circle it and plan to go.",
          "costs":{"resources":{"energy":-2}},
          "rewards":{"resources":{"socialLeverage":1}},
          "outcome_type":"success"
        },
        {
          "option_key":"ignore_invite",
          "label":"Ignore it for now.",
          "costs":{"resources":{"stress":1}},
          "outcome_type":"neutral"
        }
      ]'::jsonb,
      'step_2',
      0,
      2
    ),
    (
      'step_2',
      1,
      'The First Session',
      'You arrive to a small circle of familiar faces. They glance up, waiting.',
      '[
        {
          "option_key":"show_up",
          "label":"Sit down and contribute.",
          "costs":{"resources":{"energy":-3}},
          "rewards":{"resources":{"knowledge":2}},
          "outcome_type":"success"
        },
        {
          "option_key":"leave_early",
          "label":"Leave early with an excuse.",
          "costs":{"resources":{"socialLeverage":-1}},
          "rewards":{"resources":{"stress":-1}},
          "outcome_type":"neutral"
        }
      ]'::jsonb,
      'step_3',
      1,
      2
    ),
    (
      'step_3',
      2,
      'The Invite Follow-Up',
      'Someone asks if you will keep coming. It is a small choice, but it adds weight.',
      '[
        {
          "option_key":"commit",
          "label":"Commit to the group.",
          "costs":{"resources":{"energy":-2}},
          "rewards":{"resources":{"socialLeverage":2},"skill_points":1},
          "outcome_type":"success"
        },
        {
          "option_key":"decline",
          "label":"Decline politely.",
          "costs":{"resources":{"stress":1}},
          "outcome_type":"neutral"
        }
      ]'::jsonb,
      null,
      1,
      2
    )
) as steps(
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
on conflict (arc_id, step_key) do update
  set title = excluded.title,
      body = excluded.body,
      options = excluded.options,
      default_next_step_key = excluded.default_next_step_key,
      order_index = excluded.order_index,
      due_offset_days = excluded.due_offset_days,
      expires_after_days = excluded.expires_after_days;
