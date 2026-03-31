-- Replace s_d1_the_quad with s_d1_room_214: the dorm room opening.
--
-- s_d1_the_quad was a standalone quad-arrival scene assigned to the belonging
-- track. s_d1_room_214 replaces it as the game entry point: the player walks
-- in, Scott is already partly unpacked, and Pastime Paradise (Stevie Wonder,
-- 1976) is playing. Something in the melody catches — not recognizable, not
-- nameable, a pre-echo. The full recognition (Gangsta's Paradise) fires later
-- at the Glenn bench scene (s_d1_bench_glenn).
--
-- This storylet uses the conversational nodes system. The nodes column is
-- added here (jsonb DEFAULT NULL). Engine support for rendering nodes is a
-- separate frontend task — storing the data first.
--
-- Flags set during node walk (local to storylet):
--   opened_up         → player was warm with Scott in micro-choice 1
--   noticed_tape      → player engaged with the song at all (ask or sit)
--   asked_about_song  → player asked Scott what it was
--
-- NPC memory written (persists beyond this storylet):
--   npc_roommate_scott.started_warm       → opened_up path taken
--   npc_roommate_scott.player_noticed_music → noticed_tape path taken
--   npc_roommate_scott.player_asked_song    → asked_about_song path taken
--     ↳ gates an extra beat in s_d1_bench_glenn (Glenn notices you knew to ask)
--
-- Stream: roommate (accumulative)
-- Segment: morning | order_index: -1 | time_cost: 0
-- default_next_key: dorm_hallmates → s_d1_dorm_hallmates

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Add nodes column (conversational storylet system)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.storylets
  ADD COLUMN IF NOT EXISTS nodes jsonb DEFAULT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- 2. Delete the old opening storylet
-- ══════════════════════════════════════════════════════════════════════

DELETE FROM public.storylets WHERE slug = 's_d1_the_quad';


-- ══════════════════════════════════════════════════════════════════════
-- 3. Insert s_d1_room_214
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

  -- ── Preamble (2-3 sentences, sets the room) ──────────────────────────
  $body$The room smells like carpet cleaner and someone else's tape collection. One side already lived-in: bed made with military corners, a campus map tacked to the cinderblock with masking tape, a clock radio on the desk tuned low to something with horns. Your side is a bare mattress with a plastic cover that crinkles when you drop the duffel on it.$body$,

  -- ── Terminal choices (single continue — no real cost) ─────────────────
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
      ],
      "reaction_text": null
    }
  ]$choices$::jsonb,

  -- ── Conversational nodes ──────────────────────────────────────────────
  $nodes$[
    {
      "id": "scott_greets",
      "text": "The guy crouched by the power strip looks up. \"Hey — you must be the other one.\" He stands and wipes his hand on his jeans before offering it. \"Scott.\" Firm grip, brief.",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "warm",
          "label": "Put the duffel down, shake his hand",
          "next": "scott_easy",
          "sets_flag": "opened_up",
          "set_npc_memory": { "npc_roommate_scott": { "started_warm": true } }
        },
        {
          "id": "brief",
          "label": "\"Hey\" — and that's it",
          "next": "scott_neutral"
        },
        {
          "id": "look_around",
          "label": "Nod, look at the room",
          "next": "scott_neutral"
        }
      ]
    },
    {
      "id": "scott_easy",
      "text": "\"Grabbed the bed by the window — hope that's alright.\" He says it like he's ready to switch if it's not. \"The closets are bigger than they look.\" He turns back to the power strip.",
      "speaker": "npc_roommate_scott",
      "next": "song_moment"
    },
    {
      "id": "scott_neutral",
      "text": "\"Got here yesterday. Took the window bed.\" He reads the pause and goes back to the power strip.",
      "speaker": "npc_roommate_scott",
      "next": "song_moment"
    },
    {
      "id": "song_moment",
      "text": "The cassette player on his desk is mid-song. Something in the melody catches and holds — not the notes, the shape of them, where they seem to want to go. You've almost heard this before. Your hand stops on the zipper of the duffel.",
      "micro_choices": [
        {
          "id": "ask",
          "label": "\"What is that song?\"",
          "next": "scott_names_it",
          "sets_flag": "noticed_tape",
          "set_npc_memory": { "npc_roommate_scott": { "player_asked_song": true } },
          "identity_tags": ["people"]
        },
        {
          "id": "sit",
          "label": "Sit on the edge of the mattress",
          "next": "song_continues",
          "sets_flag": "noticed_tape",
          "set_npc_memory": { "npc_roommate_scott": { "player_noticed_music": true } }
        },
        {
          "id": "window",
          "label": "Go to the window",
          "next": "song_continues"
        }
      ]
    },
    {
      "id": "scott_names_it",
      "text": "Scott glances at the deck. \"Stevie Wonder. Pastime Paradise.\" He says it like it's the obvious answer to an obvious question. He goes back to the power strip. The melody keeps running.",
      "speaker": "npc_roommate_scott",
      "next": "choices"
    },
    {
      "id": "song_continues",
      "text": "The tape keeps going. The plastic cover on the mattress crinkles when you sit, loud enough to feel embarrassing, then settles. Somewhere down the hall, a door closes.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['game_entry', 'arc_one', 'arc_one_core', 'onboarding', 'roommate', 'day1'],
  '{}'::jsonb,
  1000, true,
  ARRAY['npc_roommate_scott']::text[],

  -- arc_id and track_id both point to roommate track
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),

  -- legacy and new key columns both set
  'room_214', 'room_214',

  -1, 0, 7,
  'dorm_hallmates', 'dorm_hallmates',

  'morning', 0
);

COMMIT;
