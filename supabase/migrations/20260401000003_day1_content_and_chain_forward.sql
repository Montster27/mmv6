-- Day 1 content + chain-forward fixes.
--
-- Two tracks currently COMPLETE on Day 0 because their terminal storylets have
-- default_next_key = NULL:
--   s_d1_evening_choice (belonging) → NULL → COMPLETED
--   s_d1_admin_errand   (academic)  → NULL → COMPLETED
--
-- This migration adds Day 1 storylets for both tracks and wires the chain ends.
--
-- Post-migration chain state:
--   ROOMMATE:   room_214 (D0) → first_morning (D1 morning) → NULL → COMPLETED
--   BELONGING:  dorm_hallmates → lunch_floor → evening_choice (D0) → hall_morning (D1 morning) → NULL → COMPLETED
--   ACADEMIC:   admin_errand (D0) → advisor_visit (D1 afternoon) → NULL → COMPLETED
--
-- Day 1 segment layout:
--   Morning   | Roommate  | first_morning  (existing)
--   Morning   | Belonging | hall_morning   (new)
--   Afternoon | Academic  | advisor_visit  (new)
--   Morning has exactly 2 storylets → fills the maxStorylets=2 cap cleanly.
--   Academic fires in afternoon — no slot competition.

BEGIN;


-- ══════════════════════════════════════════════════════════════════════
-- 1. s_d1_hall_morning — The Hallway (Belonging, Day 1 Morning)
-- ══════════════════════════════════════════════════════════════════════
--
-- Chains from evening_choice (order=3). First floor encounter of Day 1.
-- Keith heading to orientation — a practical morning beat. One micro-choice
-- about whether you're going together or going solo. No cross-storylet flags.
--
-- Flags (local):
--   going_together → coordinated path
--   going_solo     → solo path
--
-- NPC memory (persists):
--   npc_floor_keith.morning_coordinated → going_together path
--
-- Stream: belonging | Segment: morning | order_index: 4 | due_offset_days: 1

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
  's_d1_hall_morning',
  'The Hallway',

  -- ── Preamble ────────────────────────────────────────────────────────
  $body$The hallway is different at seven-thirty. Doors half-open, someone's radio tuned to the news, the sound of a shower at the far end running low — almost out of hot water from the sound of it. The floor smells like toothpaste and the industrial cleaning product maintenance uses on linoleum. Light comes through the window at the end, flat and white.$body$,

  -- ── Terminal choice (single continue) ───────────────────────────────
  $choices$[
    {
      "id": "head_to_orientation",
      "label": "Head downstairs",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": { "text": "", "deltas": {} }
    }
  ]$choices$::jsonb,

  -- ── Conversational nodes ────────────────────────────────────────────
  $nodes$[
    {
      "id": "keith_morning",
      "text": "Keith is in his doorway pulling on a jacket, a folded campus map already in his back pocket. He glances over. \"Orientation thing's at nine. You going?\"",
      "speaker": "npc_floor_keith",
      "micro_choices": [
        {
          "id": "heading_now",
          "label": "\"Yeah — heading there now\"",
          "next": "react_together",
          "sets_flag": "going_together",
          "set_npc_memory": { "npc_floor_keith": { "morning_coordinated": true } }
        },
        {
          "id": "maybe_later",
          "label": "\"Probably. Later maybe.\"",
          "next": "react_solo",
          "sets_flag": "going_solo"
        }
      ]
    },
    {
      "id": "react_together",
      "text": "\"Cool.\" He checks the map once and folds it back. \"I don't actually know where it is.\" He says it the same way he'd say anything — like not knowing something is just a starting condition and finding out is the next step.",
      "speaker": "npc_floor_keith",
      "next": "hallway_beat"
    },
    {
      "id": "react_solo",
      "text": "\"Alright.\" One syllable. He's already looking at the map again.",
      "speaker": "npc_floor_keith",
      "next": "hallway_beat"
    },
    {
      "id": "hallway_beat",
      "text": "The end of the hall is bright. Someone left a can of shaving cream on the window ledge outside the bathroom. From behind one of the closed doors, a clock radio catches the end of a song and rolls into news — the announcer's voice flat and local, something about the weather. Seventy degrees. Clear.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'belonging', 'day1'],
  '{}'::jsonb,
  200, true,
  NULL,

  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),

  'hall_morning', 'hall_morning',

  4, 1, 7,
  NULL, NULL,

  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 2. s_d1_advisor_visit — Room 108 (Academic, Day 1 Afternoon)
-- ══════════════════════════════════════════════════════════════════════
--
-- Chains from admin_errand (order=0). The advisor meeting referenced in
-- admin_errand's reaction text ("See advisor, Rm 108"). Open elective slot.
-- Course catalog with 1983 offerings — player makes a first academic lean.
--
-- Three choices (no preclusion):
--   lean_cs        → identity: achieve, risk | stress +1
--   lean_humanities → identity: achieve      | stress 0
--   defer          → identity: safety        | stress -1
--
-- Stream: academic | Segment: afternoon | order_index: 1 | due_offset_days: 1

INSERT INTO public.storylets (
  slug, title, body, choices,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  's_d1_advisor_visit',
  'Room 108',

  -- ── Body ────────────────────────────────────────────────────────────
  $body$Room 108 is at the end of the administrative hallway, past the registrar and the bulletin board with the tuition deadline circled in red marker. A man in a corduroy jacket sits behind a desk stacked with manila folders. He looks up, finds your name in the file, and pulls the course catalog to the center of the desk. Your schedule has one open slot — a handwritten note in the margin says to fill it by the end of the week.$body$,

  -- ── Terminal choices ─────────────────────────────────────────────────
  $choices$[
    {
      "id": "lean_cs",
      "label": "\"What's the computer science section like?\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["achieve", "risk"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "stress": 1 }
      },
      "events_emitted": [],
      "reaction_text": "He opens the catalog to the CS listing. \"New this semester. Lab hours Tuesday and Thursday evenings. Fills up.\" He slides a sign-up sheet across the desk. \"You have until five o'clock.\"\n\nThe lab hours would conflict with something — you don't know what yet, but the calendar fills in that direction anyway. You take the sheet."
    },
    {
      "id": "lean_humanities",
      "label": "\"Anything in history or sociology?\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["achieve"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "stress": 0 }
      },
      "events_emitted": [],
      "reaction_text": "He turns a few pages. American History to 1877 is full — same section you already have. Introduction to Sociology has two seats open. He marks the section number in pen. \"Professor Ellison's good. Lot of reading.\" He hands you the slip.\n\nThe reading doesn't bother you. The word 'lot' registers slightly."
    },
    {
      "id": "defer",
      "label": "\"Whatever fits the schedule.\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "stress": -1 }
      },
      "events_emitted": [],
      "reaction_text": "He looks at the schedule, looks at the catalog, and circles something without ceremony. Introduction to Music Appreciation, Tuesday-Thursday at two. \"Counts toward your distribution requirement.\" He signs the slip and hands it back.\n\nYou take it. It fits."
    }
  ]$choices$::jsonb,

  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'academic', 'day1'],
  '{}'::jsonb,
  200, true,
  NULL,

  (SELECT id FROM public.tracks WHERE key = 'academic'),
  (SELECT id FROM public.tracks WHERE key = 'academic'),

  'advisor_visit', 'advisor_visit',

  1, 1, 7,
  NULL, NULL,

  'afternoon', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 3. Wire evening_choice → hall_morning (belonging chain forward)
-- ══════════════════════════════════════════════════════════════════════

UPDATE public.storylets
SET default_next_step_key = 'hall_morning',
    default_next_key      = 'hall_morning'
WHERE slug = 's_d1_evening_choice';


-- ══════════════════════════════════════════════════════════════════════
-- 4. Wire admin_errand → advisor_visit (academic chain forward)
-- ══════════════════════════════════════════════════════════════════════

UPDATE public.storylets
SET default_next_step_key = 'advisor_visit',
    default_next_key      = 'advisor_visit'
WHERE slug = 's_d1_admin_errand';


COMMIT;
