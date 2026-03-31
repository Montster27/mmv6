-- Rewrite s_d1_room_214 as a fully conversational storylet.
--
-- Previous version used the tape (Pastime Paradise) as a plot device with
-- a déjà vu mechanic. This version drops the tape recognition entirely.
-- The clock radio is ambient furniture — something with horns, nobody
-- comments, nobody asks. The scene is now about two guys meeting.
--
-- Rhythm:
--   Preamble (hallway, room, two sides)
--   → scott_greets (MC1: warm / neutral / quiet)
--   → scott_warm | scott_cool (reaction)
--   → where_from (MC2: something real / rehearsed / turn it back)
--   → scott_shares + asks about major (MC3: confident / uncertain / dodge)
--   → door_knock (interruption from the hall)
--   → single terminal choice: head out
--
-- Flags (local to storylet):
--   opened_up    → MC1 warm path
--   played_cool  → MC1 neutral or quiet path
--
-- NPC memory (persists):
--   npc_roommate_scott.started_warm        → MC1 warm path
--   npc_roommate_scott.shared_real_answer   → MC2 real path
--   npc_roommate_scott.gave_surface_answer  → MC2 rehearsed path
--   npc_roommate_scott.deflected_about_self → MC2 deflect path
--
-- Identity tags (MC3 only):
--   achieve → confident major answer
--   risk    → honest uncertainty
--   safety  → dodge the question
--
-- Stream: roommate (accumulative)
-- Segment: morning | order_index: -1 | time_cost: 0
-- default_next_key: dorm_hallmates → s_d1_dorm_hallmates

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Remove the old version
-- ══════════════════════════════════════════════════════════════════════

DELETE FROM public.storylets WHERE slug = 's_d1_room_214';


-- ══════════════════════════════════════════════════════════════════════
-- 2. Insert rewritten s_d1_room_214
-- ══════════════════════════════════════════════════════════════════════

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
  's_d1_room_214',
  'Room 214',

  -- ── Preamble ────────────────────────────────────────────────────────
  $body$The hallway holds the particular heat of a building closed all summer. Doors propped open up and down the corridor, voices carrying, the scrape of furniture on linoleum. Room 214 is halfway along. One side already claimed — bed made tight, campus map taped to cinderblock, clock radio on the desk tuned low to something with horns. Your side is a bare mattress in plastic.$body$,

  -- ── Terminal choices (single continue) ──────────────────────────────
  $choices$[
    {
      "id": "head_out",
      "label": "Head out to see what's down the hall",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": [
        { "npc_id": "npc_roommate_scott", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  -- ── Conversational nodes ────────────────────────────────────────────
  $nodes$[
    {
      "id": "scott_greets",
      "text": "The guy at the desk turns around. \"Hey — you must be—\" He stands, wipes his palm on his jeans, offers it. \"Scott.\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "warm",
          "label": "Drop the duffel, shake his hand",
          "next": "scott_warm",
          "sets_flag": "opened_up",
          "set_npc_memory": { "npc_roommate_scott": { "started_warm": true } }
        },
        {
          "id": "neutral",
          "label": "\"Hey\" — set the bag down",
          "next": "scott_cool",
          "sets_flag": "played_cool"
        },
        {
          "id": "quiet",
          "label": "Nod, take in the room first",
          "next": "scott_cool",
          "sets_flag": "played_cool"
        }
      ]
    },
    {
      "id": "scott_warm",
      "text": "Firm grip, brief. \"Grabbed the window bed — hope that's cool.\" He says it like he'd switch if it mattered to you.",
      "speaker": "npc_roommate_scott",
      "next": "where_from"
    },
    {
      "id": "scott_cool",
      "text": "He lets the hand drop without making it a thing. \"Took the window bed. Closets are bigger than they look.\"",
      "speaker": "npc_roommate_scott",
      "next": "where_from"
    },
    {
      "id": "where_from",
      "text": "He crouches by the power strip again, threading a lamp cord through the tangle. On the radio, the horns go somewhere warm and come back. \"So — where you coming from?\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "real",
          "label": "Tell him something real",
          "next": "scott_shares",
          "set_npc_memory": { "npc_roommate_scott": { "shared_real_answer": true } }
        },
        {
          "id": "rehearsed",
          "label": "The orientation version",
          "next": "scott_shares",
          "set_npc_memory": { "npc_roommate_scott": { "gave_surface_answer": true } }
        },
        {
          "id": "turn_back",
          "label": "\"What about you?\"",
          "next": "scott_shares",
          "set_npc_memory": { "npc_roommate_scott": { "deflected_about_self": true } }
        }
      ]
    },
    {
      "id": "scott_shares",
      "text": "Scott's from outside Dayton. Went to a high school with a good shop program, which he mentions like it explains something he hasn't figured out how to say differently yet. Mechanical engineering, probably. \"What about you — picked a major?\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "confident",
          "label": "\"History. Definitely history.\"",
          "next": "door_knock",
          "identity_tags": ["achieve"]
        },
        {
          "id": "uncertain",
          "label": "\"Honestly? No idea yet.\"",
          "next": "door_knock",
          "identity_tags": ["risk"]
        },
        {
          "id": "dodge",
          "label": "Shrug — ask about his classes",
          "next": "door_knock",
          "identity_tags": ["safety"]
        }
      ]
    },
    {
      "id": "door_knock",
      "text": "A palm slaps the open doorframe. Someone from down the hall — untucked polo, one Converse high-top propped on the threshold. \"You guys settling in or what? Few of us are heading to the lounge.\"",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['game_entry', 'arc_one', 'arc_one_core', 'onboarding', 'roommate', 'day1'],
  '{}'::jsonb,
  1000, true,
  ARRAY['npc_roommate_scott']::text[],

  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),

  'room_214', 'room_214',

  -1, 0, 7,
  'dorm_hallmates', 'dorm_hallmates',

  'morning', 0
);

COMMIT;
