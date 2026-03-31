-- Fix Day 1 sequencing issues identified in CONTENT-INVENTORY.md
--
-- 1. Disable s_d1_bench_glenn — the Contact scene is designed for Day 1 Path C
--    only (per passage map), not the main onboarding sequence. Setting is_active
--    false removes it from the track engine queue while preserving the content.
--    Glenn's order_index=4 placed it after evening_choice, which breaks the
--    morning segment filter anyway. Re-enable when Path C branching is built.
--
-- 2. Wire s_d1_dorm_hallmates choice branching:
--    - admin_before_lunch → next_key: "lunch_floor" (advances belonging track;
--      admin_errand is served independently by the academic track queue)
--    - lunch_first → next_key: "lunch_floor" (sends player straight to dining)
--    - noncommittal → next_key: "lunch_floor" (all three paths reach lunch)
--
--    NOTE: The resolve engine is track-scoped (queries next_key within the same
--    track_id). admin_errand is on the academic track, so a cross-track next_key
--    would silently fail and mark belonging as COMPLETED. Both paths advance
--    belonging to lunch_floor; admin_errand fires from its own track.
--
-- 3. game_entry tag: already set on s_d1_room_214 by migration
--    20260331000001_add_room_214_opening.sql — no action needed.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Disable s_d1_bench_glenn until Path C branching is implemented
-- ══════════════════════════════════════════════════════════════════════

UPDATE public.storylets
SET is_active = false
WHERE slug IN (
  's_d1_bench_glenn',       -- Contact scene: Day 1 Path C only, not main sequence
  's_d1_dorm_roommate',     -- Replaced by s_d1_room_214
  's03_orientation_fair',   -- Stale belonging beat from earlier migration
  's04_cal_midnight_knock', -- Stale belonging beat from earlier migration
  's05_roommate_moment'     -- Stale roommate beat from earlier migration
);


-- ══════════════════════════════════════════════════════════════════════
-- 2. Wire hallmates branching — add next_key to two choices
-- ══════════════════════════════════════════════════════════════════════
-- All three choices get next_key: "lunch_floor" — every path through hallmates
-- reaches the dining hall. Social deposits differ; destination doesn't.

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    elem || '{"next_key": "lunch_floor"}'::jsonb
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE slug = 's_d1_dorm_hallmates';

COMMIT;
