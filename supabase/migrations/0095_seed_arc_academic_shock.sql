insert into public.arc_definitions (key, title, description, tags, is_enabled)
values
  (
    'arc_academic_shock',
    'The First Academic Shock',
    'A rough early assessment forces you to decide how you respond to pressure: seek help, outwork everyone, or pretend it isn’t happening.',
    '["Craft","Agency"]'::jsonb,
    true
  )
on conflict (key) do update
  set title = excluded.title,
      description = excluded.description,
      tags = excluded.tags,
      is_enabled = excluded.is_enabled;

with arc as (
  select id from public.arc_definitions where key = 'arc_academic_shock'
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
      'a_growth_1',
      0,
      'Red Ink',
      'Your paper comes back with more red than white. In the hall, someone has taped up a hand-drawn sign: “Study group—Tues 8pm—Lounge.”',
      '[
        {
          "option_key":"ask_ta",
          "label":"Go to office hours.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"resources":{"knowledge":1}},
          "next_step_key":"a_growth_2"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'a_growth_2',
      1,
      'Office Hours',
      'The TA doesn’t rescue you, but they don’t shame you either. They point at one paragraph and say: “Start here.”',
      '[
        {
          "option_key":"commit_plan",
          "label":"Commit to a simple plan and show up next week.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Agency":1}},
          "next_step_key":"a_growth_3"
        },
        {
          "option_key":"avoid_followup",
          "label":"Leave feeling better, but don’t commit.",
          "costs":{},
          "rewards":{},
          "next_step_key":"a_avoid_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_growth_3',
      2,
      'The Lounge Table',
      'The study group meets under a buzzing fluorescent light. Someone is copying notes from a spiral notebook like it’s a ritual.',
      '[
        {
          "option_key":"participate",
          "label":"Participate, even if it’s awkward.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"resources":{"knowledge":1},"dispositions":{"Craft":1}},
          "next_step_key":"a_growth_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_growth_4',
      3,
      'Small Win',
      'You solve one problem on the board. It’s not elegant, but it’s correct. A couple people nod like that matters.',
      '[
        {
          "option_key":"build_habit",
          "label":"Turn this into a habit.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Craft":1}},
          "next_step_key":"a_growth_5"
        },
        {
          "option_key":"go_solo",
          "label":"Decide you’ll go solo from here.",
          "costs":{},
          "rewards":{"dispositions":{"Agency":1}},
          "next_step_key":"a_compete_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_growth_5',
      4,
      'Second Assessment',
      'The next quiz is still hard. But now you can feel where you’re strong and where you’re not, instead of just feeling stupid.',
      '[
        {
          "option_key":"steady",
          "label":"Stay steady under pressure.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"resources":{"knowledge":2}},
          "next_step_key":"a_growth_6"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_growth_6',
      5,
      'A New Baseline',
      'You’re not suddenly brilliant. You’re consistent. That’s the point. Your work starts to feel like yours.',
      '[
        {
          "option_key":"complete_growth",
          "label":"You keep showing up.",
          "costs":{},
          "rewards":{"dispositions":{"Craft":2,"Agency":1},"skill_points":1},
          "next_step_key":null
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_compete_1',
      6,
      'Red Ink',
      'Your paper comes back rough. In the hallway, you hear someone say: “That class weeds people out.”',
      '[
        {
          "option_key":"overdrive",
          "label":"Decide you’ll outwork everyone.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Agency":1}},
          "next_step_key":"a_compete_2"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'a_compete_2',
      7,
      'Late-Night Grind',
      'The lounge TV is on low. Someone flips channels until they land on a music video. You keep your head down and write anyway.',
      '[
        {
          "option_key":"push",
          "label":"Push through the fatigue.",
          "costs":{"resources":{"energy":-2}},
          "rewards":{"resources":{"knowledge":2},"dispositions":{"Craft":1}},
          "next_step_key":"a_compete_3"
        },
        {
          "option_key":"crack",
          "label":"You can’t focus. You stop early.",
          "costs":{},
          "rewards":{},
          "next_step_key":"a_avoid_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_compete_3',
      8,
      'Comparison',
      'You overhear two students trading scores like they’re trading baseball cards. You feel your chest tighten.',
      '[
        {
          "option_key":"compete",
          "label":"Make it personal: you will beat them.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Craft":1}},
          "next_step_key":"a_compete_4"
        },
        {
          "option_key":"reframe",
          "label":"Make it practical: you will improve.",
          "costs":{},
          "rewards":{"dispositions":{"Agency":1}},
          "next_step_key":"a_growth_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_compete_4',
      9,
      'Shortcut Offered',
      'Someone offers you old answers, quietly. Just for ‘reference.’',
      '[
        {
          "option_key":"refuse",
          "label":"Refuse and keep grinding.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Integrity":1,"Craft":1}},
          "next_step_key":"a_compete_5"
        },
        {
          "option_key":"take",
          "label":"Take them. You’re tired of losing.",
          "costs":{},
          "rewards":{"resources":{"knowledge":1}},
          "next_step_key":"a_compete_5"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_compete_5',
      10,
      'The Cost',
      'You perform better. You also feel edgy—like you can’t let yourself slow down, or it all falls apart.',
      '[
        {
          "option_key":"double_down",
          "label":"Double down. Keep the pressure on.",
          "costs":{"resources":{"energy":-2}},
          "rewards":{"resources":{"knowledge":2},"dispositions":{"Craft":1}},
          "next_step_key":"a_compete_6"
        },
        {
          "option_key":"back_off",
          "label":"Back off. Try to be sustainable.",
          "costs":{},
          "rewards":{},
          "next_step_key":"a_growth_5"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_compete_6',
      11,
      'High Output, Tight Chest',
      'Your results look good. Your life feels smaller. You’re respected, but you’re always bracing.',
      '[
        {
          "option_key":"complete_compete",
          "label":"You become relentless.",
          "costs":{},
          "rewards":{"dispositions":{"Craft":2},"resources":{"knowledge":1},"skill_points":1},
          "next_step_key":null
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_avoid_1',
      12,
      'Red Ink',
      'Your paper comes back rough. You fold it in half like that makes it smaller.',
      '[
        {
          "option_key":"ignore",
          "label":"Ignore it. You’ll figure it out later.",
          "costs":{},
          "rewards":{},
          "next_step_key":"a_avoid_2"
        }
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'a_avoid_2',
      13,
      'Busywork',
      'You do easy tasks that feel productive. Clean notes. Recopy headings. Anything but the hard part.',
      '[
        {
          "option_key":"keep_avoiding",
          "label":"Keep avoiding the hard part.",
          "costs":{},
          "rewards":{},
          "next_step_key":"a_avoid_3"
        },
        {
          "option_key":"reach_out",
          "label":"Reach out for help at the last moment.",
          "costs":{"resources":{"energy":-1}},
          "rewards":{},
          "next_step_key":"a_growth_3"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_avoid_3',
      14,
      'Cram Night',
      'Late night. The hallway phone rings. Someone yells for their roommate. You stare at the page and realize you don’t know where to start.',
      '[
        {
          "option_key":"panic_cram",
          "label":"Panic-cram anyway.",
          "costs":{"resources":{"energy":-2}},
          "rewards":{"resources":{"knowledge":1}},
          "next_step_key":"a_avoid_4"
        },
        {
          "option_key":"sleep",
          "label":"Go to sleep and hope.",
          "costs":{},
          "rewards":{"resources":{"energy":1}},
          "next_step_key":"a_avoid_4"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_avoid_4',
      15,
      'The Result',
      'The score is worse than last time. Not catastrophic. Just enough to make you dread the next one.',
      '[
        {
          "option_key":"minimize",
          "label":"Minimize it: “It’s fine.”",
          "costs":{},
          "rewards":{},
          "next_step_key":"a_avoid_5"
        },
        {
          "option_key":"face_it",
          "label":"Face it: “This is a pattern.”",
          "costs":{"resources":{"energy":-1}},
          "rewards":{"dispositions":{"Agency":1}},
          "next_step_key":"a_growth_2"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_avoid_5',
      16,
      'Drift',
      'You keep drifting, telling yourself the real you will show up later—next week, next month, next term.',
      '[
        {
          "option_key":"complete_avoid",
          "label":"You stay afloat, but you don’t grow.",
          "costs":{},
          "rewards":{"skill_points":0},
          "next_step_key":"a_avoid_6"
        }
      ]'::jsonb,
      null,
      1,
      2
    ),
    (
      'a_avoid_6',
      17,
      'The Reluctance',
      'The class becomes something you avoid thinking about. It’s not failure. It’s hesitation you carry forward.',
      '[
        {
          "option_key":"end_avoid",
          "label":"You don’t confront it this year.",
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
