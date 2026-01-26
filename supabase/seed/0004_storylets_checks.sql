-- Storylets with skill/state checks (run in Supabase SQL Editor)
insert into public.storylets (slug, title, body, choices, tags, is_active, requirements)
values
  (
    'index_card',
    'Index Card',
    'You find a catalog drawer labeled only with a handwritten date. The cards are blank except for faint impressions.',
    '[
      {
        "id":"A",
        "label":"Read the impressions",
        "check":{
          "id":"library_index",
          "baseChance":0.45,
          "skillWeights":{"focus":0.03,"memory":0.02},
          "energyWeight":0.01,
          "stressWeight":-0.02,
          "postureBonus":{"steady":0.02,"push":0.01}
        },
        "outcomes":[
          {
            "id":"success",
            "weight":1,
            "text":"A few lines rise out of the paper. It reads like a note you meant to leave yourself.",
            "deltas":{"stress":-1,"energy":0,"vectors":{"reflection":1}}
          },
          {
            "id":"failure",
            "weight":1,
            "text":"The impressions refuse to align. You close the drawer and feel the missed signal.",
            "deltas":{"stress":1,"energy":-1}
          }
        ]
      }
    ]'::jsonb,
    '{study,psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'hallway_glance',
    'Hallway Glance',
    'A small group pauses as you pass. Their conversation continues, but their eyes check in to see if you are listening.',
    '[
      {
        "id":"A",
        "label":"Catch the thread",
        "check":{
          "id":"social_thread",
          "baseChance":0.4,
          "skillWeights":{"networking":0.03},
          "energyWeight":0.01,
          "stressWeight":-0.015,
          "postureBonus":{"connect":0.03}
        },
        "outcomes":[
          {
            "id":"success",
            "weight":1,
            "text":"You recognize the pattern and tuck it away. The air feels less hostile.",
            "deltas":{"stress":-1,"energy":0,"vectors":{"social":1}}
          },
          {
            "id":"failure",
            "weight":1,
            "text":"The words dissolve into noise. You keep walking, slower than before.",
            "deltas":{"stress":1,"energy":-1}
          }
        ]
      }
    ]'::jsonb,
    '{social,psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'breathing_count',
    'Breathing Count',
    'You count your breaths in sets of four, hoping the day will loosen its grip.',
    '[
      {
        "id":"A",
        "label":"Stay with the count",
        "check":{
          "id":"breathing_control",
          "baseChance":0.5,
          "skillWeights":{"grit":0.02,"memory":0.01},
          "energyWeight":0.02,
          "stressWeight":-0.03,
          "postureBonus":{"recover":0.04}
        },
        "outcomes":[
          {
            "id":"success",
            "weight":1,
            "text":"The edges soften. For a moment, the room agrees with you.",
            "deltas":{"stress":-2,"energy":1}
          },
          {
            "id":"failure",
            "weight":1,
            "text":"Your count slips. The knot stays tied.",
            "deltas":{"stress":1,"energy":0}
          }
        ]
      }
    ]'::jsonb,
    '{health,psych,unreliable}',
    true,
    '{}'::jsonb
  )
on conflict (slug) do update
set title = excluded.title,
    body = excluded.body,
    choices = excluded.choices,
    tags = excluded.tags,
    is_active = excluded.is_active,
    requirements = excluded.requirements;
