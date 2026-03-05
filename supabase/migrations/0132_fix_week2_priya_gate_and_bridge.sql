-- Migration 0132: Fix unreachable Priya gate on s12 + ensure 3-slot coverage
--
-- Problem: After migration 0131 enforces max_total_runs:1 correctly, Week 2
-- storylets (s12-s17) are the only arc_one_core content available from Day 7+.
-- However s12_study_group_invite has requires_npc_met: ["npc_studious_priya"].
-- Priya is NEVER "met" in Week 1: every path through s7_first_class that
-- involves her emits NOTICED_FACE, which sets knows_face but NOT met=true.
-- The met=true flag requires INTRODUCED_SELF, SHOWED_UP, WOKE_IN_SAME_ROOM,
-- or SHARED_MEAL.
--
-- Result: s12 is permanently blocked for all players. On Day 7+, only s15
-- (requires Dana, always met) and s17 (no NPC gate) are guaranteed — that is
-- only 2 storylets for 3 required slots, so selectStorylets pads with
-- fallbackStorylet() every single day.
--
-- Fix 1: Remove the requires_npc_met gate from s12.
-- The Study Group invite becomes the INTRODUCTION to Priya — she noticed the
-- player in class and seeks them out. This matches the narrative (s7 body
-- describes her as already engaged with the material; she initiates contact).
-- The min_day_index: 3 guard still prevents it from appearing too early.
--
-- Fix 2: Change s7 "raise_hand_answer" to emit SHOWED_UP (not NOTICED_FACE)
-- for Priya so that players who actively participated in class DO mark Priya
-- as met — unlocking s12 even earlier for those players once it opens.
-- The "wait_someone_else" path keeps NOTICED_FACE (passive observation only).
--
-- Fix 3: Touch updated_at on both storylets to bust the localStorage cache.

-- ============================================================
-- 1. Remove requires_npc_met gate from s12
--    Keep min_day_index: 3 and max_day_index: 10 and max_total_runs: 1
-- ============================================================
UPDATE public.storylets
SET
  requirements = (requirements - 'requires_npc_met')
    || jsonb_build_object('min_day_index', 3, 'max_day_index', 10, 'max_total_runs', 1),
  updated_at   = NOW()
WHERE slug = 's12_study_group_invite';

-- ============================================================
-- 2. Upgrade Priya's event in s7 "raise_hand_answer" from
--    NOTICED_FACE → SHOWED_UP so active-participation players
--    also get her met flag (for future NPC-gated content).
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'raise_hand_answer' THEN
          jsonb_set(
            choice,
            '{events_emitted}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN ev->>'npc_id' = 'npc_studious_priya' THEN
                    ev || '{"type": "SHOWED_UP"}'::jsonb
                  ELSE ev
                END
              )
              FROM jsonb_array_elements(choice->'events_emitted') AS ev
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's7_first_class';
