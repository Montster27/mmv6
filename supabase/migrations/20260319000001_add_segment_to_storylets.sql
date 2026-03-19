-- Phase 1: Add segment system fields to storylets table.
--
-- segment: which time-of-day slot this beat belongs to
--          (morning | afternoon | evening | night)
-- time_cost_hours: how many hours from the daily budget this beat consumes

ALTER TABLE public.storylets
  ADD COLUMN IF NOT EXISTS segment          text    CHECK (segment IN ('morning','afternoon','evening','night')),
  ADD COLUMN IF NOT EXISTS time_cost_hours  numeric DEFAULT 1;

-- Index for fast segment-based filtering in selectArcBeats
CREATE INDEX IF NOT EXISTS storylets_segment_idx
  ON public.storylets (segment)
  WHERE segment IS NOT NULL;

COMMENT ON COLUMN public.storylets.segment IS
  'Day-segment when this beat is available: morning | afternoon | evening | night. NULL = any segment (legacy beats).';

COMMENT ON COLUMN public.storylets.time_cost_hours IS
  'Hours deducted from the daily budget when this beat is played. Default 1.';
