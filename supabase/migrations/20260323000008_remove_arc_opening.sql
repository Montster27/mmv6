-- Remove the old arc_opening arc and its storylets.
-- arc_opening is superseded by arc_roommate which handles the Day 1
-- morning sequence (hallway → room 212 → quad reveal).
-- The old arc_opening had gender-incorrect content (Dana she/her, Sandra)
-- and no segment/time_cost_hours fields.

BEGIN;

-- Delete the 5 arc_opening storylets
DELETE FROM public.storylets
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_opening');

-- Delete any arc_instances pointing to arc_opening
DELETE FROM public.arc_instances
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_opening');

-- Disable arc_opening (keep the definition for audit trail, just disable)
UPDATE public.arc_definitions
SET is_enabled = false
WHERE key = 'arc_opening';

-- Also delete the 3 standalone evening storylets that were created
-- before the evening_choice arc beat was added (they're now redundant —
-- the evening_choice beat in arc_belonging handles all 3 paths inline)
DELETE FROM public.storylets
WHERE slug IN ('s_evening_caps', 's_evening_cards', 's_evening_sub')
  AND arc_id IS NULL;

COMMIT;
