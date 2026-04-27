-- Dana → Scott scrub on user-visible prose (T-1777055123000).
--
-- The roommate is Scott (npc_roommate_scott, per docs/NPC_DATA_REFERENCE.md).
-- Two user-visible node-text strings still carry the leftover "Dana" from a
-- prior draft. Scope per the ticket: VISIBLE PROSE ONLY. Internal IDs
-- (storylet_keys, node_ids, choice_ids, requires_flag/sets_flag values
-- containing "dana") are intentionally out of scope — those would break
-- playthrough scripts, save data, and the cross-track flag union.
--
-- Fixes:
--   1. tuesday_commitment.schedule_scan.text — two Dana mentions in one
--      paragraph: "Dana mentioned a movie..." and "as close as Dana gets to
--      an invitation." Both refer to the roommate.
--   2. tuesday_night_study.empty_room_study.text — "Dana is not there. The
--      movie he mentioned started at 9:15."
--
-- Idempotent: replace() of a substring that no longer exists is a no-op.

BEGIN;

UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'schedule_scan'
      THEN jsonb_set(elem, '{text}', to_jsonb(replace(elem->>'text', 'Dana', 'Scott')))
      ELSE elem
    END
  )
  FROM jsonb_array_elements(nodes) AS elem
)
WHERE storylet_key = 'tuesday_commitment';

UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'empty_room_study'
      THEN jsonb_set(elem, '{text}', to_jsonb(replace(elem->>'text', 'Dana', 'Scott')))
      ELSE elem
    END
  )
  FROM jsonb_array_elements(nodes) AS elem
)
WHERE storylet_key = 'tuesday_night_study';

COMMIT;
