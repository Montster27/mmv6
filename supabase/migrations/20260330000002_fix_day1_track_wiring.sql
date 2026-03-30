-- Fix Day 1 storylet wiring for the track-based Chapter One engine.
--
-- Problems fixed:
-- 1. track_id/storylet_key were NULL (migration only set arc_id/step_key)
-- 2. expires_after_days was NULL/0 (storylets vanish same day they appear)
-- 3. s_d1_the_quad and s_d1_bench_glenn had no track assignment
-- 4. Stale track_progress rows pointed to deleted storylet keys

BEGIN;

-- 1. Delete stale track_progress pointing to old Day 1 storylet keys
DELETE FROM public.track_progress
WHERE current_storylet_key IN (
  'hallway_arrival', 'room_212_morning', 'bookstore_line',
  'dining_first_dinner', 'floor_meeting', 'roommate_moment',
  'orientation_fair', 'money_reality_check'
);

-- 2. Assign the_quad and bench_glenn to the belonging track
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.tracks WHERE key = 'belonging'),
    step_key = CASE slug
      WHEN 's_d1_the_quad' THEN 'the_quad'
      WHEN 's_d1_bench_glenn' THEN 'bench_glenn'
    END,
    order_index = CASE slug
      WHEN 's_d1_the_quad' THEN -1
      WHEN 's_d1_bench_glenn' THEN 4
    END
WHERE slug IN ('s_d1_the_quad', 's_d1_bench_glenn');

-- 3. Sync track_id/storylet_key/default_next_key from legacy columns for all Day 1
UPDATE public.storylets
SET track_id = arc_id,
    storylet_key = step_key,
    default_next_key = default_next_step_key
WHERE slug LIKE 's_d1_%';

-- 4. Set expires_after_days to 7 for all Day 1 storylets
UPDATE public.storylets
SET expires_after_days = 7
WHERE slug LIKE 's_d1_%';

COMMIT;
