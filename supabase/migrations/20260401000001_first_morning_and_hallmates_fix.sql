-- Two changes in this migration:
--
-- 1. Fix noncommittal dead end in s_d1_dorm_hallmates
--    The noncommittal choice ("I might catch up with you") is missing next_key,
--    leaving the belonging track with no forward pointer. This adds
--    next_key: "lunch_floor" to any choice that lacks it — idempotent.
--
-- 2. New storylet: s_d1_first_morning (Day 1, Morning)
--    First beat of Day 1. Player wakes up in Room 214. Short conversational
--    scene — morning light, hallway sounds, a Scott exchange about orientation.
--    One micro-choice (morning dynamic), one terminal choice (head out).
--    Stream: roommate (accumulative). No time or energy cost.
--    default_next_key: NULL (orientation assembly not built yet).

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Fix hallmates noncommittal dead end
-- ══════════════════════════════════════════════════════════════════════
-- Adds next_key: "lunch_floor" to any choice missing it. The
-- admin_before_lunch and lunch_first choices should already have it
-- from an earlier migration; this catches noncommittal.

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN NOT (elem ? 'next_key')
      THEN elem || '{"next_key": "lunch_floor"}'::jsonb
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE slug = 's_d1_dorm_hallmates';


-- ══════════════════════════════════════════════════════════════════════
-- 2. s_d1_first_morning — First Morning (Day 1, Morning)
-- ══════════════════════════════════════════════════════════════════════
--
-- Rhythm:
--   Preamble (waking, light, hallway sounds, the body half-second)
--   → scott_morning (MC1: coordinated / noncommittal / independent)
--   → react_together | react_noncommittal | react_independent
--   → hallway_beat (bathroom, building finding its rhythm)
--   → single terminal choice: head to orientation
--
-- Flags:
--   morning_together → coordinated path
--   morning_solo     → noncommittal or independent path
--
-- NPC memory:
--   npc_roommate_scott.morning_coordinated → walked together

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
  's_d1_first_morning',
  'First Morning',

  -- ── Preamble ────────────────────────────────────────────────────────
  $body$Light through an unfamiliar window, the blinds striping the opposite wall. Down the hall a shower running, someone's stereo half-tuned through static, a door slamming. You swing your legs off the mattress and your feet hit cold linoleum. You stand — easy, the whole thing, like the body's been waiting.$body$,

  -- ── Terminal choices ────────────────────────────────────────────────
  $choices$[
    {
      "id": "head_to_orientation",
      "label": "Head out across the quad",
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
      "id": "scott_morning",
      "text": "Scott's pulling a shirt on, already half-ready. His alarm clock says 8:47. Through the window, the quad is empty except for a maintenance guy dragging a trash can across the grass. \"You going to that orientation thing at ten?\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "coordinated",
          "label": "\"Yeah — walk over together?\"",
          "next": "react_together",
          "sets_flag": "morning_together",
          "set_npc_memory": { "npc_roommate_scott": { "morning_coordinated": true } }
        },
        {
          "id": "noncommittal",
          "label": "\"I don't know, maybe.\"",
          "next": "react_noncommittal",
          "sets_flag": "morning_solo"
        },
        {
          "id": "independent",
          "label": "\"Yeah, might as well.\" Grab your towel.",
          "next": "react_independent",
          "sets_flag": "morning_solo"
        }
      ]
    },
    {
      "id": "react_together",
      "text": "\"Yeah, cool.\" He checks his watch — plastic digital, numbers still sharp. \"Give me like ten minutes. I'll knock.\" He says it like he's been walking to things with people his whole life.",
      "speaker": "npc_roommate_scott",
      "next": "hallway_beat"
    },
    {
      "id": "react_noncommittal",
      "text": "\"Cool.\" He pulls on a sneaker and doesn't push it. The clock radio on his desk catches a weather report — clear, high of seventy-one. He reaches over and turns the volume down, not quite off.",
      "speaker": "npc_roommate_scott",
      "next": "hallway_beat"
    },
    {
      "id": "react_independent",
      "text": "Scott's \"see you there\" follows you into the hallway. He sounds like he means it.",
      "next": "hallway_beat"
    },
    {
      "id": "hallway_beat",
      "text": "The bathroom at the end of the hall. Three stalls, two showers behind vinyl curtains, a bar of soap in a plastic case on the sink ledge. You brush your teeth while someone two stalls down hums something you don't recognize. The building is finding its rhythm — doors, footsteps, a laugh bouncing off cinderblock.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'roommate', 'day1'],
  '{}'::jsonb,
  200, true,
  NULL,

  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),

  'first_morning', 'first_morning',

  -1, 1, NULL,
  NULL, NULL,

  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;

COMMIT;
