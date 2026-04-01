-- Fix roommate track chain so first_morning is reachable.
--
-- Problem: room_214 has default_next_key = 'dorm_hallmates', which is on the
-- BELONGING track, not the roommate track. The resolve engine is track-scoped:
-- it queries `WHERE track_id = roommate_track_id AND storylet_key = 'dorm_hallmates'`
-- → returns NULL → sets current_storylet_key to an unresolvable key → roommate
-- track silently stalls and first_morning is never reached.
--
-- Fix 1: Change room_214 default_next_key to 'first_morning' (same track).
--        After resolving room_214, the roommate track advances to first_morning
--        with storylet_due_day = started_day + 1 (morning of Day 1).
--
-- Fix 2: Change first_morning order_index from -1 to 1.
--        Both room_214 and first_morning currently have order_index = -1.
--        buildInitialTrackProgress() picks the lowest-order_index storylet as
--        the track entry point. A tie at -1 is non-deterministic. Raising
--        first_morning to 1 makes room_214 (order -1) the unambiguous first.
--
-- Fix 3: Ensure noncommittal choice in s_d1_dorm_hallmates has next_key.
--        Already applied in 20260401000001 but re-applied here idempotently
--        as a single authoritative fix. No harm if already present (|| merges).
--
-- Post-migration chain state:
--
--   ROOMMATE TRACK
--     s_d1_room_214        order=-1  due=Day0  → [default] first_morning
--     s_d1_first_morning   order=1   due=Day1  → NULL → COMPLETED
--
--   BELONGING TRACK
--     s_d1_dorm_hallmates  order=1   due=Day0  → [choice next_key] lunch_floor
--     s_d1_lunch_floor     order=2   due=Day0  → [default] evening_choice
--     s_d1_evening_choice  order=3   due=Day0  → NULL → COMPLETED
--     s_d1_bench_glenn     order=4   due=Day0  → NULL — DISABLED, unreachable
--
--   ACADEMIC TRACK
--     s_d1_admin_errand    order=0   due=Day0  → NULL → COMPLETED
--
--   MONEY / OPPORTUNITY / HOME TRACKS
--     No storylets with these track_ids → no progress rows created.
--
-- Notes:
--   • "Day 0" = player's started_day (arrival). "Day 1" = started_day + 1.
--   • The belonging track has no Day 1+ content yet — it COMPLETEs on Day 0.
--   • The academic track COMPLETEs immediately after admin_errand.
--   • first_morning is the only Day 1 content currently built.

BEGIN;

-- ── 1. Re-point room_214 to first_morning (same track) ───────────────────────

UPDATE public.storylets
SET default_next_step_key = 'first_morning',
    default_next_key      = 'first_morning'
WHERE slug = 's_d1_room_214';


-- ── 2. Raise first_morning order_index to 1 (avoid -1 tie with room_214) ─────

UPDATE public.storylets
SET order_index = 1
WHERE slug = 's_d1_first_morning';


-- ── 3. Ensure all hallmates choices have next_key (idempotent) ────────────────

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN NOT (elem ? 'next_key')
        THEN elem || '{"next_key": "lunch_floor"}'::jsonb
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE slug = 's_d1_dorm_hallmates';

COMMIT;
