-- Widen expiry windows on Day 1 beats so they don't disappear
-- if the cadence system advances the day prematurely.
-- All Day 1 beats get expires_after_days = 7 (a full week to complete).

BEGIN;

-- Arc Roommate beats
UPDATE public.storylets
SET expires_after_days = 7
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate')
  AND step_key IN ('hallway_arrival', 'room_212_morning', 'quad_reveal');

-- Also fix room_212_morning which had NULL expires_after_days
UPDATE public.storylets
SET expires_after_days = 7
WHERE step_key = 'room_212_morning'
  AND arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate');

-- Arc Belonging beats (Day 1)
UPDATE public.storylets
SET expires_after_days = 7
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging')
  AND step_key IN ('dining_first_dinner', 'floor_meeting', 'evening_choice');

-- Arc Money beats (Day 1)
UPDATE public.storylets
SET expires_after_days = 7
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_money')
  AND step_key = 'bookstore_line';

COMMIT;
