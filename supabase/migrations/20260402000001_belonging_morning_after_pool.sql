-- Morning-after pool storylets for the belonging track.
--
-- These are the first pool-based, choice-gated storylets. No next_key chains
-- into them. They surface via pool scan based on requires_choice, which gates
-- on choice IDs from s_d1_evening_choice:
--
--   go_to_party  → s_d2_morning_after_party
--   go_to_cards  → s_d2_morning_after_cards
--   go_to_union  → s_d2_morning_after_union
--
-- All three share: belonging track, due_offset_days=1, segment=morning,
-- expires_after_days=7, no introduces_npc, time_cost_hours=0,
-- default_next_key=NULL.
--
-- Requires ENGINE-QUEUE-PLAN pool scan + requires_choice gating to surface.

BEGIN;


-- ══════════════════════════════════════════════════════════════════════
-- 1. s_d2_morning_after_party — Anderson Hall Residue
-- ══════════════════════════════════════════════════════════════════════
--
-- Gates on: requires_choice = "go_to_party"
-- The floor is buzzing about last night. Doug is already editing the
-- party into a better version of itself. You brush your teeth and the
-- face in the mirror has a night behind it.
--
-- Micro-choice: how you respond to Doug's recap (easy laugh vs. keep moving)
--
-- Stream: belonging | Segment: morning | order_index: 10 | due_offset_days: 1

INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  's_d2_morning_after_party',
  'Anderson Hall Residue',

  -- Preamble ──────────────────────────────────────────────────────────
  $body$Your ears carry a thin ringing from the stereo at Anderson Hall. Not loud — just enough to sit underneath everything else, a souvenir from the speakers Bryce had stacked on a dresser. The hallway has the specific energy of a floor where half the residents were in the same room last night.$body$,

  -- Terminal choice ───────────────────────────────────────────────────
  $choices$[
    {
      "id": "continue_morning",
      "label": "Head back to your room",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": { "text": "", "deltas": {} }
    }
  ]$choices$::jsonb,

  -- Conversational nodes ──────────────────────────────────────────────
  $nodes$[
    {
      "id": "doug_hallway",
      "text": "Doug is near the bathroom, toothbrush in hand, telling Peterson about the girl who beat Bryce at caps. He sees you and points the toothbrush like a conductor's baton. \"There he is. You left before the best part — Bryce tried a keg stand and the whole table went sideways.\"",
      "speaker": "npc_floor_doug",
      "micro_choices": [
        {
          "id": "easy_laugh",
          "label": "\"Sounds about right\"",
          "next": "morning_corridor",
          "sets_flag": "easy_laugh"
        },
        {
          "id": "keep_moving",
          "label": "Keep walking — you remember plenty",
          "next": "morning_corridor",
          "sets_flag": "kept_moving"
        }
      ]
    },
    {
      "id": "morning_corridor",
      "text": "The hallway is bright with flat institutional light. Someone propped their door open with a textbook — you can see the corner of a Nagel print on the wall inside. Doug is already adding details that weren't there. The room was bigger in his version. The music louder. That's how it works. The night becomes the story of the night.",
      "next": "bathroom_beat"
    },
    {
      "id": "bathroom_beat",
      "text": "You brush your teeth. The mirror is fogged from someone's shower. Through the wall, a clock radio catches the morning news — grain futures, a temperature, a baseball score from a game that should have gone differently. The toothpaste is the same brand as yesterday. The face looking back has a night behind it now.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'day2'],
  '{"requires_choice": "go_to_party"}'::jsonb,
  200, true,
  NULL,

  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),

  'morning_after_party', 'morning_after_party',

  10, 1, 7,
  NULL, NULL,

  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 2. s_d2_morning_after_cards — The Buy-In
-- ══════════════════════════════════════════════════════════════════════
--
-- Gates on: requires_choice = "go_to_cards"
-- Quieter morning. You're part of the lounge crowd now. Mike offers
-- a standing invitation without seeming to. The floor's shared story
-- happened at Anderson Hall — yours happened around a low table with
-- Peterson's cards.
--
-- Micro-choice: commit to tonight's game or keep options open
--
-- Stream: belonging | Segment: morning | order_index: 11 | due_offset_days: 1

INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  's_d2_morning_after_cards',
  'The Buy-In',

  -- Preamble ──────────────────────────────────────────────────────────
  $body$The floor is quieter this morning than the party crowd deserves. You slept well. Your hands remember the weight of Peterson's cards — the particular bridge shuffle, thumbs pressing the halves together like someone who learned from a grandfather.$body$,

  -- Terminal choice ───────────────────────────────────────────────────
  $choices$[
    {
      "id": "continue_morning",
      "label": "Head to the stairs",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": { "text": "", "deltas": {} }
    }
  ]$choices$::jsonb,

  -- Conversational nodes ──────────────────────────────────────────────
  $nodes$[
    {
      "id": "mike_hallway",
      "text": "Mike is at the hall phone, receiver balanced between shoulder and ear, reading numbers off a scrap of paper. He sees you and holds up a hand — not a wave, just contact. When he hangs up, he straightens the cord and lets it spring back.",
      "speaker": "npc_floor_mike",
      "next": "mike_offer"
    },
    {
      "id": "mike_offer",
      "text": "\"Peterson's running cards again tonight. Quarter buy-in.\" He says it like he's reading a bus schedule. There's an invitation in there, buried under the delivery.",
      "speaker": "npc_floor_mike",
      "micro_choices": [
        {
          "id": "commit",
          "label": "\"I'm in\"",
          "next": "morning_board",
          "sets_flag": "committed",
          "set_npc_memory": { "npc_floor_mike": { "cards_regular": true } }
        },
        {
          "id": "noncommittal",
          "label": "\"We'll see\"",
          "next": "morning_board",
          "sets_flag": "noncommittal"
        }
      ]
    },
    {
      "id": "morning_board",
      "text": "The bulletin board by the stairs has a new flyer — intramural volleyball, sign-up deadline circled in red ink. Someone taped a lost-key notice next to it, handwriting cramped and urgent. From the bathroom, the sound of water that was hot ten minutes ago and isn't anymore.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'day2'],
  '{"requires_choice": "go_to_cards"}'::jsonb,
  200, true,
  NULL,

  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),

  'morning_after_cards', 'morning_after_cards',

  11, 1, 7,
  NULL, NULL,

  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 3. s_d2_morning_after_union — The Quarter
-- ══════════════════════════════════════════════════════════════════════
--
-- Gates on: requires_choice = "go_to_union"
-- You went alone. The floor is buzzing about a party you already
-- know about from three bathroom conversations. Scott reports without
-- judgment. The quarter from the snake game is still on your desk.
--
-- Micro-choice: engage with Scott's party recap or deflect
--
-- Stream: belonging | Segment: morning | order_index: 12 | due_offset_days: 1

INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  's_d2_morning_after_union',
  'The Quarter',

  -- Preamble ──────────────────────────────────────────────────────────
  $body$You slept well. Better than most of the floor, probably — no one knocking on doors at one in the morning, no secondhand noise from Anderson Hall. The quarter from the snake game is on your desk. You took it from the machine's return slot without thinking.$body$,

  -- Terminal choice ───────────────────────────────────────────────────
  $choices$[
    {
      "id": "continue_morning",
      "label": "Pocket the quarter and head out",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": { "text": "", "deltas": {} }
    }
  ]$choices$::jsonb,

  -- Conversational nodes ──────────────────────────────────────────────
  $nodes$[
    {
      "id": "party_echoes",
      "text": "Through your open door, last night's Anderson Hall party drifts down the hallway in other people's versions. Doug is telling someone about a caps game. A name you don't recognize comes up twice. The floor has a shared story now, and you weren't in it.",
      "next": "scott_beat"
    },
    {
      "id": "scott_beat",
      "text": "Scott is pulling on his shoes. \"You shoulda come, man. Bryce had a whole setup.\" He says it without judgment — Scott doesn't do judgment, he just reports.",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "deflect",
          "label": "\"Sounds like it was something\"",
          "next": "quarter_detail",
          "sets_flag": "deflected"
        },
        {
          "id": "ask",
          "label": "\"How was it?\"",
          "next": "quarter_detail",
          "sets_flag": "asked_about_it"
        }
      ]
    },
    {
      "id": "quarter_detail",
      "text": "The sun through the window hits the edge of your desk. The quarter catches the light — 1983, Jefferson's profile facing the wall. You pick it up and put it in your pocket. Something to carry from a night that was yours and nobody else's.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'day2'],
  '{"requires_choice": "go_to_union"}'::jsonb,
  200, true,
  NULL,

  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),

  'morning_after_union', 'morning_after_union',

  12, 1, 7,
  NULL, NULL,

  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


COMMIT;
