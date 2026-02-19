insert into public.arc_definitions (key, title, description, tags, is_enabled)
values
  (
    'arc_romantic_risk',
    'The First Romantic Risk',
    'A small connection appears. You choose whether to be honest, perform, or retreat—each path changes what you learn about closeness.',
    '["Love","Courage","Belonging"]'::jsonb,
    true
  )
on conflict (key) do update
  set title = excluded.title,
      description = excluded.description,
      tags = excluded.tags,
      is_enabled = excluded.is_enabled;

with arc as (
  select id from public.arc_definitions where key = 'arc_romantic_risk'
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
      'r_honest_1',
      0,
      'Noticing',
      'You keep seeing the same person in the same places—by the bulletin board, near the student union, lingering after class.',
      '[
        {
          "option_key":"say_hi",
          "label":"Say hi and keep it simple.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Courage":1}},
          "next_step_key":"r_honest_2"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'r_honest_2',
      1,
      'A Real Conversation',
      'You talk about nothing important: a professor’s quirks, a song you heard on the radio, the weirdness of being new somewhere. It feels easy.',
      '[
        {
          "option_key":"ask_out",
          "label":"Ask them to get coffee.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Love":1}},
          "next_step_key":"r_honest_3"
        },
        {
          "option_key":"stall",
          "label":"Keep it friendly for now.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_retreat_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_honest_3',
      2,
      'Coffee After Class',
      'They show up. They’re a little nervous too. Outside, the air has that early-fall bite that makes everything feel sharper.',
      '[
        {
          "option_key":"be_direct",
          "label":"Be direct: you’d like to see them again.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Love":1,"Courage":1}},
          "next_step_key":"r_honest_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_honest_4',
      3,
      'The Small Reveal',
      'They share something small but real: a fear about the future, or about not fitting here. The moment asks something of you.',
      '[
        {
          "option_key":"reciprocate",
          "label":"Share something real back.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Love":2}},
          "next_step_key":"r_honest_5"
        },
        {
          "option_key":"deflect",
          "label":"Deflect with humor.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_perform_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_honest_5',
      4,
      'A Plan',
      'They suggest something simple: a campus event, a walk, maybe listening to music in the lounge when no one’s around.',
      '[
        {
          "option_key":"say_yes",
          "label":"Say yes and follow through.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"r_honest_6"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_honest_6',
      5,
      'A First Pattern',
      'It’s not a grand romance. It’s a first pattern: you can be honest and still be wanted. That changes something in you.',
      '[
        {
          "option_key":"complete_honest",
          "label":"You choose closeness with honesty.",
          "costs":{},
          "rewards":{"dispositions":{"Love":2,"Courage":1},"skill_points":1},
          "next_step_key":null
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_perform_1',
      6,
      'Noticing',
      'You keep seeing the same person around campus. You think about the version of yourself you could present—polished, easy, impressive.',
      '[
        {
          "option_key":"approach_polished",
          "label":"Approach with confidence you don’t fully feel.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"r_perform_2"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'r_perform_2',
      7,
      'Signal',
      'You reference something cool—music, a scene, an event—something that says you belong. They smile, but you can’t tell what they’re seeing.',
      '[
        {
          "option_key":"turn_on_charm",
          "label":"Lean into charm and banter.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"r_perform_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_perform_3',
      8,
      'The Invite',
      'You invite them to something public—student union, lounge, a campus event. A safe setting where you can keep control.',
      '[
        {
          "option_key":"public_date",
          "label":"Keep it public and easy.",
          "costs":{},
          "rewards":{"dispositions":{"Love":1}},
          "next_step_key":"r_perform_4"
        },
        {
          "option_key":"switch_to_honest",
          "label":"Make it smaller: ask for coffee instead.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Courage":1}},
          "next_step_key":"r_honest_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_perform_4',
      9,
      'The Moment That Asks More',
      'There’s a quiet moment—walking back, standing near the hallway phone, a pause where the performance could drop.',
      '[
        {
          "option_key":"stay_on_script",
          "label":"Stay on script. Keep it light.",
          "costs":{},
          "rewards":{"dispositions":{"Belonging":1}},
          "next_step_key":"r_perform_5"
        },
        {
          "option_key":"risk_truth",
          "label":"Risk one honest sentence.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Courage":1}},
          "next_step_key":"r_honest_5"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_perform_5',
      10,
      'Included',
      'You’re included. You’re liked. You also feel like you’re holding your breath, waiting to see if the real you would still be welcome.',
      '[
        {
          "option_key":"complete_perform",
          "label":"You choose control over vulnerability.",
          "costs":{},
          "rewards":{"dispositions":{"Belonging":2},"skill_points":1},
          "next_step_key":"r_perform_6"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_perform_6',
      11,
      'A Different Pattern',
      'This works—for now. But the relationship is built around the version of you that never fully relaxes.',
      '[
        {
          "option_key":"end_perform",
          "label":"You stay liked, and slightly distant.",
          "costs":{},
          "rewards":{},
          "next_step_key":null
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_retreat_1',
      12,
      'Noticing',
      'You keep seeing them. Each time you think: maybe next time. Each time you don’t.',
      '[
        {
          "option_key":"do_nothing",
          "label":"Do nothing.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_retreat_2"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'r_retreat_2',
      13,
      'Almost',
      'You pass near the bulletin board and slow down, as if you might stop. You keep walking.',
      '[
        {
          "option_key":"avoid",
          "label":"Avoid the risk.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_retreat_3"
        },
        {
          "option_key":"try_honest",
          "label":"Try—just say hi.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Courage":1}},
          "next_step_key":"r_honest_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_retreat_3',
      14,
      'The Story You Tell Yourself',
      'You build a tidy story: they’re not your type, you’re busy, it wouldn’t work. The story feels safer than the truth.',
      '[
        {
          "option_key":"rationalize",
          "label":"Believe the story.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_retreat_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_retreat_4',
      15,
      'A Missed Chance',
      'You see them laughing with someone else near the lounge TV. It’s ordinary. It still lands like a small loss.',
      '[
        {
          "option_key":"withdraw",
          "label":"Withdraw further.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_retreat_5"
        },
        {
          "option_key":"risk_anyway",
          "label":"Risk it anyway—talk to them now.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Courage":1}},
          "next_step_key":"r_honest_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_retreat_5',
      16,
      'Pattern Forms',
      'It isn’t heartbreak. It’s a pattern: you protect yourself from pain by never reaching for what you want.',
      '[
        {
          "option_key":"complete_retreat",
          "label":"You choose safety this time.",
          "costs":{},
          "rewards":{},
          "next_step_key":"r_retreat_6"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'r_retreat_6',
      17,
      'Reluctance',
      'You carry the hesitation forward. Next time, the cost of trying feels slightly higher—because you’ve practiced not trying.',
      '[
        {
          "option_key":"end_retreat",
          "label":"You don’t confront this in Year 1.",
          "costs":{"resources":{"stress":1}},
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
