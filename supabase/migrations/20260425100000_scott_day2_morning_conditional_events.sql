-- scott_day2_morning — tighten head_out_alone events_emitted via conditional groups.
--
-- The original migration (20260417300000_scott_day2_morning.sql) emitted
-- DEFERRED_TENSION unconditionally on head_out_alone, per the brief's
-- §3 fallback recommendation: "the absent-path player gets it too, which is
-- appropriate — they deferred by never being in the room at the same time."
--
-- With conditional events_emitted infrastructure shipped in commit 6d7d1a9
-- (period-stance branch), we can now scope the deferred-tension penalty to
-- only the brief-and-leave path:
--
--   - flag was_brief set     → DEFERRED_TENSION magnitude 0.5
--   - else (absent / no flag) → no event
--
-- The "absent" path is no longer penalised: a player whose Day 0 took the
-- played_cool path lands in entry_absent, where Scott is already gone —
-- the deferred tension was created upstream in room_214, not by leaving the
-- empty room. Double-counting was the artefact this migration removes.
--
-- Replaces choices[id=head_out_alone].events_emitted in-place; idempotent.

BEGIN;

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'head_out_alone'
      THEN jsonb_set(
        elem,
        '{events_emitted}',
        $events$[
          {
            "condition": { "flag": "was_brief" },
            "events": [
              { "npc_id": "npc_roommate_scott", "type": "DEFERRED_TENSION", "magnitude": 0.5 }
            ]
          },
          { "condition": { "else": true }, "events": [] }
        ]$events$::jsonb
      )
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'scott_day2_morning'
  AND is_active = true;

-- Verification: the head_out_alone choice should now contain a grouped form
-- with two entries (was_brief group + else group). Run after migration:
--
-- SELECT jsonb_pretty(
--   (SELECT c FROM jsonb_array_elements(choices) AS c WHERE c->>'id' = 'head_out_alone')
-- )
-- FROM public.storylets WHERE storylet_key = 'scott_day2_morning';

COMMIT;
