-- Replace temporary arc content with "Find Your People".

delete from public.arc_steps
where arc_id in (
  select id from public.arc_definitions where key in ('arc_branch_test', 'arc_study_group')
);

delete from public.arc_definitions where key in ('arc_branch_test', 'arc_study_group');

insert into public.arc_definitions (key, title, description, tags, is_enabled)
values
  (
    'arc_find_your_people',
    'Find Your People',
    'Your first year, you keep seeing the same group in the lounge. You decide whether to step in or stay on the edges.',
    '["Belonging","Courage"]'::jsonb,
    true
  )
on conflict (key) do update
  set title = excluded.title,
      description = excluded.description,
      tags = excluded.tags,
      is_enabled = excluded.is_enabled;

with arc as (
  select id from public.arc_definitions where key = 'arc_find_your_people'
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
select arc.id, steps.*
from arc
cross join (
  values
    (
      'entry_lounge',
      0,
      'The Lounge',
      'The lounge TV is playing music videos. A group is arguing about whether MTV is ruining radio. Someone laughs loudly. A handwritten flyer about a nuclear freeze meeting hangs crooked on the bulletin board.',
      '[
        {
          "option_key":"approach",
          "label":"Walk over and join them.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{},
          "next_step_key":"branch_a_1"
        },
        {
          "option_key":"observe",
          "label":"Stay nearby and listen.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_b_1"
        },
        {
          "option_key":"leave",
          "label":"Head back to your room.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_c_1"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'branch_a_1',
      1,
      'First Contribution',
      'They pause long enough for you to speak. You mention the band playing at the student union this weekend.',
      '[
        {
          "option_key":"honest_opinion",
          "label":"Say what you really think.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"branch_a_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_2',
      2,
      'Smaller Invite',
      'One of them asks if you want to grab coffee after class tomorrow.',
      '[
        {
          "option_key":"accept",
          "label":"Go.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{},
          "next_step_key":"branch_a_3"
        },
        {
          "option_key":"decline",
          "label":"Make an excuse.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_c_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_3',
      3,
      'Shared Story',
      'They admit they almost transferred last semester.',
      '[
        {
          "option_key":"share",
          "label":"Tell them something real about your first week.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":2}},
          "next_step_key":"branch_a_4"
        },
        {
          "option_key":"deflect",
          "label":"Change the subject.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_b_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_4',
      4,
      'Disagreement',
      'They mock someone for being too ''preppy.'' You disagree.',
      '[
        {
          "option_key":"speak_up",
          "label":"Say that’s not fair.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Courage":1}},
          "next_step_key":"branch_a_5"
        },
        {
          "option_key":"stay_silent",
          "label":"Stay quiet.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_b_5"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_5',
      5,
      'Seen Clearly',
      'Later, one of them thanks you for saying something.',
      '[
        {
          "option_key":"complete",
          "label":"You feel like yourself here.",
          "costs":{},
          "rewards":{"dispositions":{"Belonging":3},"skill_points":1},
          "next_step_key":null
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_1',
      6,
      'Adaptive Persona',
      'You mirror their jokes about music and professors.',
      '[
        {
          "option_key":"lean_in",
          "label":"Play along.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"branch_b_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_2',
      7,
      'Status Moment',
      'Someone teases a quiet student passing by.',
      '[
        {
          "option_key":"join",
          "label":"Laugh with them.",
          "costs":{},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"branch_b_3"
        },
        {
          "option_key":"neutral",
          "label":"Stay neutral.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_a_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_3',
      8,
      'Recognition',
      'You’re becoming the fun one.',
      '[
        {
          "option_key":"continue",
          "label":"Keep it up.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"branch_b_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_4',
      9,
      'Alone Later',
      'Back in your dorm, the hallway phone rings for someone else. The laughter feels far away.',
      '[
        {
          "option_key":"double_down",
          "label":"You’re fine. This is working.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_b_5"
        },
        {
          "option_key":"reconsider",
          "label":"Maybe something feels off.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_a_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_5',
      10,
      'Known for Something',
      'You’re included. You’re also performing.',
      '[
        {
          "option_key":"complete",
          "label":"This is who you are here.",
          "costs":{},
          "rewards":{"dispositions":{"Belonging":2},"skill_points":1},
          "next_step_key":null
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_1',
      11,
      'Back to Your Room',
      'You can hear music through the wall. Someone down the hall is rewinding a mix tape.',
      '[
        {
          "option_key":"stay_in",
          "label":"Stay in.",
          "costs":{},
          "rewards":{"resources":{"knowledge":1}},
          "next_step_key":"branch_c_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_2',
      12,
      'Seeing Them Again',
      'The next night, they’re together again.',
      '[
        {
          "option_key":"ignore",
          "label":"Tell yourself you don’t care.",
          "costs":{},
          "rewards":{},
          "next_step_key":"branch_c_3"
        },
        {
          "option_key":"try_again",
          "label":"Try once more.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{},
          "next_step_key":"branch_a_1"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_3',
      13,
      'Justification',
      'You decide you’re different from them.',
      '[
        {
          "option_key":"complete",
          "label":"Keep to yourself.",
          "costs":{},
          "rewards":{},
          "next_step_key":null
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
