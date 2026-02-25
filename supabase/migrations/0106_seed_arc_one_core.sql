-- Remove shock arcs and seed the single Arc One core arc + storylets.

-- Remove shock arc storylets (by tag) and arc records.
DELETE FROM public.storylets
WHERE tags && ARRAY['shock_academic', 'shock_social', 'shock_romantic',
  'entry:shock_academic', 'entry:shock_social', 'entry:shock_romantic']::text[];

DELETE FROM public.arc_steps
WHERE arc_id IN (
  SELECT id FROM public.arc_definitions
  WHERE key IN ('shock_academic', 'shock_social', 'shock_romantic')
);

DELETE FROM public.arc_definitions
WHERE key IN ('shock_academic', 'shock_social', 'shock_romantic');

-- Ensure Arc One core definition exists.
INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
SELECT
  'arc_one_core',
  'Arc One: First Week',
  'The first week arc for Arc One.',
  '["risk","safety","people","achievement","confront","avoid"]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.arc_definitions WHERE key = 'arc_one_core'
);

-- Remove existing Arc One storylets if present.
DELETE FROM public.storylets
WHERE slug IN (
  's1_dorm_wake_dislocation',
  's2_hall_phone',
  's3_dining_hall',
  's4_midday_choice',
  's5_roommate_tension',
  's6_day2_consequence'
);

-- Seed Arc One storylets.
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
VALUES
(
  's1_dorm_wake_dislocation',
  'The Room That Fits Too Well',
  $$You wake before the alarm.

The light feels slightly wrong.

Thin dorm curtains glow the color of weak tea. The air smells like industrial cleaner and cardboard. Somewhere down the hall, someone laughs too loudly. A radio leaks something tinny and bright — The Police, maybe.

For a second, you don’t know where you are.

Then it lands.

College.

Your parents drove away yesterday. Your mother held on a little too long. Your father cleared his throat like he does when he’s about to say something important and decides not to.

Across the room, your roommate is already awake.

Dana sits cross-legged on her bed, flipping through the course catalog like it’s a novel. She looks up.

“Big day,” she says.

You know — before she does it — that she’s about to tuck her hair behind her ear.

She does.

The familiarity lands like a skipped heartbeat.

Your eyes drift to the wall above your desk.

There’s a poster there.

You don’t remember putting it up.

It isn’t strange. Just a campus flyer. Slightly crooked.

You have the uncomfortable sense that you’ve already seen it fall.$$
  ,
  '[
    {
      "id": "ask_dana_sleep",
      "label": "Ask Dana how she slept.",
      "targetStoryletId": "s2_hall_phone",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": []
    },
    {
      "id": "comment_poster",
      "label": "Comment on the poster.",
      "targetStoryletId": "s2_hall_phone",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": []
    },
    {
      "id": "find_dining_hall",
      "label": "Say you should find the dining hall before it gets crowded.",
      "targetStoryletId": "s2_hall_phone",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": []
    },
    {
      "id": "organize_desk",
      "label": "Stay quiet and start organizing your desk.",
      "targetStoryletId": "s2_hall_phone",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety","achievement"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core','entry:arc_one_core']::text[],
  true
),
(
  's2_hall_phone',
  'The Hall Phone',
  $$The hallway smells like shampoo and nerves.

Doors are propped open with sneakers. Names written in thick marker hang crookedly on construction paper.

At the end of the hall, the dorm phone rings.

The sound slices through everything.

You knew it would ring.

Your body moves before you think.

Dana glances at you.

“Are you going to get that?”

For a split second, you feel certain you already know the name the caller will ask for.

You don’t know how.

The phone keeps ringing.$$
  ,
  '[
    {
      "id": "answer_phone",
      "label": "Answer the phone.",
      "targetStoryletId": "s3_dining_hall",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk","people"],
      "relational_effects": {
        "npc_connector_miguel": { "trust": 1 }
      }
    },
    {
      "id": "ignore_phone",
      "label": "Let someone else grab it.",
      "targetStoryletId": "s3_dining_hall",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety","avoid"]
    },
    {
      "id": "tell_dana_answer",
      "label": "Tell Dana she should answer it.",
      "targetStoryletId": "s3_dining_hall",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["avoid","people"],
      "relational_effects": {
        "npc_roommate_dana": { "reliability": -1 }
      }
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
),
(
  's3_dining_hall',
  'The Dining Hall',
  $$The dining hall is louder than you expected.

Trays clatter. Plastic cups scrape. The smell is coffee, eggs, and something overcooked.

Clusters have already formed.

You spot Miguel — the guy from yesterday — laughing like he’s been here for years. He sees you. Or maybe he doesn’t.

You’re holding a tray.

Dana hangs half a step behind you.

There are a hundred ways this moment can go.

You have the strange feeling that you’ve already chosen one.$$
  ,
  '[
    {
      "id": "approach_miguel",
      "label": "Walk straight toward Miguel’s table and introduce yourself.",
      "targetStoryletId": "s4_midday_choice",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk","people"],
      "relational_effects": {
        "npc_connector_miguel": { "trust": 1 }
      }
    },
    {
      "id": "sit_with_dana",
      "label": "Find an empty two-seat table with Dana.",
      "targetStoryletId": "s4_midday_choice",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["safety","people"],
      "relational_effects": {
        "npc_roommate_dana": { "trust": 1 }
      }
    },
    {
      "id": "sit_alone",
      "label": "Sit alone and read your schedule.",
      "targetStoryletId": "s4_midday_choice",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["safety","achievement"],
      "relational_effects": {
        "npc_connector_miguel": { "trust": -1 }
      }
    },
    {
      "id": "hover_near_table",
      "label": "Hover near Miguel’s table and wait for an opening.",
      "targetStoryletId": "s4_midday_choice",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["avoid","people"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
),
(
  's4_midday_choice',
  'The Midday Choice',
  $$The quad is a maze of folding tables and hand-lettered signs.

“Orientation Social.”
“Campus Radio.”
“Work-Study Applications.”
“Bookstore →”

A long line already curls outside the bookstore.

Miguel leans toward you. “We’re heading to the freshman thing. You should come.”

Dana says, “We should get books before they sell out.”

You look at the line.

You look at the crowd.

You can feel something closing, even before you choose.$$
  ,
  '[
    {
      "id": "bookstore_line",
      "label": "Get in the bookstore line.",
      "targetStoryletId": "s5_roommate_tension",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["achievement","safety"],
      "set_flags": { "bookstore_completed": true }
    },
    {
      "id": "freshman_social",
      "label": "Go to the freshman social with Miguel.",
      "targetStoryletId": "s5_roommate_tension",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk","people"],
      "relational_effects": {
        "npc_connector_miguel": { "trust": 1 }
      },
      "set_flags": { "bookstore_completed": false }
    },
    {
      "id": "walk_alone",
      "label": "Say you’ll handle books tomorrow and take a walk alone.",
      "targetStoryletId": "s5_roommate_tension",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["safety","avoid"],
      "set_flags": { "bookstore_completed": false }
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
),
(
  's5_roommate_tension',
  'Roommate Tension',
  $$The room is dim when you get back.

Dana pauses her cassette player when you walk in.

“You didn’t come back after the social,” she says.
Or:
“I thought we were going to grab dinner.”

It’s small.

The kind of small thing that doesn’t stay small.

You have the uncomfortable sense that this is a fork in the road.

You’ve stood here before.

Not here.

Somewhere else.$$
  ,
  '[
    {
      "id": "address_directly",
      "label": "Address it directly.",
      "targetStoryletId": "s6_day2_consequence",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["confront","risk"],
      "relational_effects": {
        "npc_roommate_dana": { "trust": 1, "reliability": 1 }
      }
    },
    {
      "id": "joke_deflect",
      "label": "Make a joke and let it slide.",
      "targetStoryletId": "s6_day2_consequence",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["avoid","people"],
      "relational_effects": {
        "npc_roommate_dana": { "reliability": -1, "emotionalLoad": 1 }
      }
    },
    {
      "id": "deal_tomorrow",
      "label": "Say you’re tired and deal with it tomorrow.",
      "targetStoryletId": "s6_day2_consequence",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["safety","avoid"],
      "relational_effects": {
        "npc_roommate_dana": { "reliability": -1 }
      },
      "set_flags": { "deferred_roommate_tension": true }
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
),
(
  's6_day2_consequence',
  'Day 2 Consequence',
  $$Morning comes too quickly.

The light feels the same as yesterday.

Or maybe you just feel different inside it.

If you skipped the bookstore line, class begins with a small, quiet panic. The professor says, “Please open to Chapter One.” You don’t have it. The girl next to you shifts her book slightly so you can see. You feel grateful. And smaller than you expected. You remember the bookstore line. You remember not standing in it.

If Dana’s reliability has slipped or you deferred the tension, Dana doesn’t look at you when she leaves for class. It’s not anger. It’s distance. That’s worse.

You did what felt right in the moment.

But moments accumulate.

You have the strange feeling that you’ve lived this shape of week before.$$
  ,
  '[
    {
      "id": "trigger_reflection",
      "label": "Continue.",
      "targetStoryletId": "",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": []
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
);
