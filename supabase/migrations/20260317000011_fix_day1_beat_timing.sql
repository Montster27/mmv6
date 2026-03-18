-- Day 1 should present only the hallway (hallway_arrival, arc_roommate).
-- Two stream beats were also due on day 1 because they had due_offset_days=0:
--   • bookstore_line  (arc_money)     — "The Line"
--   • dining_first_dinner (arc_belonging) — "The Dining Hall"
--
-- Both should begin on day 2 (due_offset_days = 1) so the player has a clean,
-- single-beat opening day before the other narrative streams engage.
--
-- Existing arc_instances for these steps will be left with their current
-- step_due_day; they will naturally re-sync on the next daily loop or after
-- a reset. A reset (which players in dev use regularly) deletes all instances
-- so new ones are created with the corrected offset.

UPDATE public.storylets
SET
  due_offset_days = 1,
  updated_at      = now()
WHERE step_key IN ('bookstore_line', 'dining_first_dinner');
