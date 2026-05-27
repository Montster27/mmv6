-- ============================================================
-- Add `board` column to harvest_items + backfill the 14 usenet rows
-- ============================================================
-- Ticket: T-1776329282002
-- Spec:   docs/specs/CODE-SPEC-newsnet-multiuser.md
--
-- Adds an explicit `board` column on harvest_items so the NewsNet
-- merge query can filter by board directly. The alternative — parsing
-- newsgroup hints out of the `attribution` string (e.g. `pklein @
-- net.college`) — couples board routing to attribution syntax and
-- doesn't map cleanly to our three boards. A column keeps that
-- coupling out of the query layer.
--
-- Column is nullable: only `type='usenet'` rows are populated. Future
-- usenet content authored elsewhere must include `board` explicitly.
--
-- Backfill mapping (see ticket §7 plan decision A3 / design call):
--   All 6 traces        -> net.philosophy   (the investigation board)
--   texture_002 (rwalsh, Police review)            -> rec.music
--   texture_006 (lortega, Patti Smith carpool)     -> rec.music
--   All other 6 textures                           -> net.misc
-- ============================================================

BEGIN;

ALTER TABLE public.harvest_items
  ADD COLUMN IF NOT EXISTS board TEXT;

-- Index for the NewsNet merge query: (type, board, day_min)
CREATE INDEX IF NOT EXISTS harvest_items_type_board_day_idx
  ON public.harvest_items (type, board, day_min);

-- ── Backfill: 6 traces -> net.philosophy ──
UPDATE public.harvest_items SET board = 'net.philosophy'
WHERE slug IN (
  'harvest_usenet_trace_001',
  'harvest_usenet_trace_002',
  'harvest_usenet_trace_003',
  'harvest_usenet_trace_004',
  'harvest_usenet_trace_005',
  'harvest_usenet_trace_006'
);

-- ── Backfill: 2 music-topic textures -> rec.music ──
UPDATE public.harvest_items SET board = 'rec.music'
WHERE slug IN (
  'harvest_usenet_texture_002',  -- rwalsh: Police - Synchronicity review
  'harvest_usenet_texture_006'   -- lortega: Patti Smith carpool
);

-- ── Backfill: remaining 6 textures -> net.misc ──
UPDATE public.harvest_items SET board = 'net.misc'
WHERE slug IN (
  'harvest_usenet_texture_001',  -- pklein: dining hall
  'harvest_usenet_texture_003',  -- fcampbell: new to network
  'harvest_usenet_texture_004',  -- sbauer: roommate venting
  'harvest_usenet_texture_005',  -- dmorrow: KAL 007
  'harvest_usenet_texture_007',  -- tgreene: study strategies
  'harvest_usenet_texture_008'   -- anonymous: loneliness
);

-- Sanity: every usenet row must now have a board. (This is a guard,
-- not a constraint — if it ever fails, surface the row in a test.)
DO $check$
DECLARE
  unset_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unset_count
  FROM public.harvest_items
  WHERE type = 'usenet' AND board IS NULL;

  IF unset_count > 0 THEN
    RAISE EXCEPTION 'NewsNet board backfill: % usenet rows have NULL board after migration', unset_count;
  END IF;
END
$check$;

COMMENT ON COLUMN public.harvest_items.board IS
  'NewsNet board name (net.philosophy | net.misc | rec.music). Populated for type=''usenet'' rows; NULL otherwise.';

COMMIT;

-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP INDEX IF EXISTS public.harvest_items_type_board_day_idx;
-- ALTER TABLE public.harvest_items DROP COLUMN IF EXISTS board;
