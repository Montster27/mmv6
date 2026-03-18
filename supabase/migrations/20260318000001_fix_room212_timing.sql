-- room_212_morning had due_offset_days=0, which caused it to fire on Day 1
-- immediately after the player completed hallway_arrival (the API sets
-- step_due_day = dayIndex + due_offset_days = 1 + 0 = 1).
--
-- Fix: due_offset_days=1 so it becomes due on Day 2 after the hallway.
-- Also set expires_after_days=3 (was NULL) so it doesn't linger forever.

UPDATE public.storylets
SET
  due_offset_days    = 1,
  expires_after_days = 3,
  updated_at         = now()
WHERE step_key = 'room_212_morning';
