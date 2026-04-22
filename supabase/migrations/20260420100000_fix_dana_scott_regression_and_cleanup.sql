-- Fix Dana→Scott naming regression in 6 storylets + delete deprecated dorm_roommate.
-- Follows 2026-04-17 rename migration (20260417200000_rename_dana_to_scott.sql), which
-- cleared the original set. These 6 storylets either landed after that migration or
-- regressed since. Identified by gap analysis (T-006, 2026-04-17).
--
-- Case-sensitive REPLACE on 'Dana' only — leaves storylet_keys (e.g. `dana_cereal`)
-- and the legacy `npc_roommate_dana` key intact (latter was scrubbed by the earlier
-- rename migration and is not present on these rows).

-- ============================================================
-- PART 1: Dana → Scott replacement in body / choices / nodes
-- ============================================================

-- body (text) — five storylets
UPDATE storylets
SET body = REPLACE(body, 'Dana', 'Scott')
WHERE storylet_key IN (
  'dana_cereal',
  'dana_letter_avoidance',
  'dana_letter_connected',
  'dana_letter_surface',
  'tuesday_night_dana_movie'
) AND body LIKE '%Dana%';

-- choices (jsonb) — five storylets
UPDATE storylets
SET choices = REPLACE(choices::text, 'Dana', 'Scott')::jsonb
WHERE storylet_key IN (
  'dana_letter_avoidance',
  'dana_letter_connected',
  'dana_letter_surface',
  'tuesday_night_dana_movie',
  'tuesday_night_terminal'
) AND choices::text LIKE '%Dana%';

-- nodes (jsonb) — four storylets
UPDATE storylets
SET nodes = REPLACE(nodes::text, 'Dana', 'Scott')::jsonb
WHERE storylet_key IN (
  'dana_cereal',
  'dana_letter_avoidance',
  'dana_letter_connected',
  'dana_letter_surface'
) AND nodes IS NOT NULL AND nodes::text LIKE '%Dana%';

-- ============================================================
-- PART 2: Delete deprecated `dorm_roommate`
-- ============================================================
-- dorm_roommate is inactive, roommate track, Day 0 morning, title "Room 214" —
-- same track/day/segment/title as the active `room_214` that replaced it.
-- Pre-delete verification (all ran clean against live DB 2026-04-20):
--   - No storylet has default_next_key = 'dorm_roommate'
--   - No storylet.choices or storylet.nodes references 'dorm_roommate'
--   - No storylet.requirements references 'dorm_roommate'
--   - No choice_log.step_key = 'dorm_roommate'
--   - No track_progress.next_key_override = 'dorm_roommate'
-- dorm_roommate itself still has default_next_key = 'dorm_hallmates' (cross-track to
-- belonging — already broken and inactive), so removal loses nothing.
DELETE FROM storylets WHERE storylet_key = 'dorm_roommate';

-- ============================================================
-- PART 3: Audit — remaining inactive storylets (NO ACTION, kept as reference)
-- ============================================================
--
-- hall_morning (belonging, Day 1 morning, order_index 4)
--   default_next_key: NULL
--   Inbound refs: NONE (no default_next_key targets, no choice next_keys,
--                 no nodes/requirements/precludes refs, no choice_log or
--                 track_progress state). Fully orphaned.
--   History: deactivated 2026-04-03 — the ungated pool entry was out-competing
--   the choice-gated morning_after_* variants on the belonging track. Kept
--   around as a reference for the bug pattern. Safe to delete in a future sweep.
--
-- orientation_fair + cal_midnight_knock (belonging, stranded 2-link chain)
--   orientation_fair: Day 1 afternoon, order_index 4, default_next_key = 'cal_midnight_knock'
--   cal_midnight_knock: Day 2 evening, order_index 5, default_next_key = NULL
--   Inbound refs: orientation_fair is not referenced anywhere; cal_midnight_knock
--   is referenced ONLY by orientation_fair (the chain head). Together they form a
--   self-contained inactive chain. Safe to delete as a pair (orientation_fair first
--   then cal_midnight_knock) but preserved for now as design reference for the
--   early Cal-arc concept that got shelved.
--
-- roommate_moment (roommate, Day 3 evening, order_index 3)
--   default_next_key: NULL
--   Inbound refs: NONE. Fully orphaned. Preserved as the placeholder for the
--   unwritten Day 3 evening roommate beat — the slot is still empty in the
--   gap-analysis matrix. Delete once the replacement content lands.

-- ============================================================
-- PART 4: Verify — remaining Dana refs on the six target storylets
-- ============================================================
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM storylets
  WHERE storylet_key IN (
    'dana_cereal',
    'dana_letter_avoidance',
    'dana_letter_connected',
    'dana_letter_surface',
    'tuesday_night_dana_movie',
    'tuesday_night_terminal'
  )
  AND (
    body LIKE '%Dana%'
    OR choices::text LIKE '%Dana%'
    OR (nodes IS NOT NULL AND nodes::text LIKE '%Dana%')
  );

  IF cnt > 0 THEN
    RAISE WARNING 'Still % storylets with "Dana" references after migration', cnt;
  END IF;
END $$;
