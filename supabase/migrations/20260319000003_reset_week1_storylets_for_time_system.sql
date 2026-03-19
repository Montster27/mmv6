-- Phase 1: Clear all week-1 arc storylets and seed two placeholder beats
-- for time-system testing.
--
-- Deletes every storylet that belongs to the seven Arc One arc_definitions.
-- Arc_definitions, arc_instances schema, and player_day_state are preserved.
-- The two placeholder beats have proper segment + time_cost_hours values so
-- Phase 1 UI (header, DevMenu advance) can be verified immediately.

BEGIN;

-- ── 1. Delete all week-1 arc storylets ───────────────────────────────────────

DELETE FROM public.storylets
WHERE arc_id IN (
  SELECT id FROM public.arc_definitions
  WHERE key IN (
    'arc_roommate', 'arc_academic', 'arc_money',
    'arc_belonging', 'arc_people', 'arc_opportunity', 'arc_home'
  )
);

-- ── 2. Seed test_morning_beat ─────────────────────────────────────────────────

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  arc_id, step_key, order_index, due_offset_days, expires_after_days,
  default_next_step_key, segment, time_cost_hours
)
SELECT
  'test_morning_beat',
  'Morning (placeholder)',
  E'Light comes through the curtains at an angle that means it''s mid-morning.\n\nEverything is still new enough to notice: the sound of the hallway, the smell of the building, the particular quality of silence from Dana''s side of the room.\n\nYou have the morning.',
  '[
    {
      "id": "get_up",
      "label": "Get up and face it",
      "outcome": { "text": "You pull yourself out of bed.", "deltas": { "energy": -1, "stress": -1 } },
      "next_step_key": "test_evening_beat"
    }
  ]'::jsonb,
  ARRAY['arc_one_core','time_system_test'],
  '{}'::jsonb,
  1,
  true,
  d.id,
  'test_morning_beat',
  1,
  0,              -- available from day 1
  NULL,
  'test_evening_beat',
  'morning',
  1               -- costs 1 hour
FROM public.arc_definitions d
WHERE d.key = 'arc_roommate'
LIMIT 1;

-- ── 3. Seed test_evening_beat ─────────────────────────────────────────────────

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  arc_id, step_key, order_index, due_offset_days, expires_after_days,
  default_next_step_key, segment, time_cost_hours
)
SELECT
  'test_evening_beat',
  'Evening (placeholder)',
  E'The hall outside is louder now. Dinner smells drift up from somewhere below.\n\nIt''s that in-between hour — not late enough to feel like night, not early enough to feel like you have the whole evening ahead.\n\nYou sit on your bed and think about what to do with the time.',
  '[
    {
      "id": "wind_down",
      "label": "Start winding down",
      "outcome": { "text": "The day is getting long.", "deltas": { "energy": -1, "stress": -1 } }
    }
  ]'::jsonb,
  ARRAY['arc_one_core','time_system_test'],
  '{}'::jsonb,
  1,
  true,
  d.id,
  'test_evening_beat',
  2,
  0,              -- available from day 1
  NULL,
  NULL,
  'evening',
  1               -- costs 1 hour
FROM public.arc_definitions d
WHERE d.key = 'arc_roommate'
LIMIT 1;

COMMIT;
