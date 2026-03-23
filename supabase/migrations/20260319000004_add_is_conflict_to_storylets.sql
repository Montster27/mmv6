-- Phase 3: Add is_conflict flag to storylets.
--
-- Conflict beats surface when a player's daily time budget is tight —
-- "Your shift starts in an hour. Cal just knocked."
-- They create forced choice between commitment and opportunity.
--
-- is_conflict = true  → beat surfaces when hours_remaining < threshold
--                        even if it is not the player's current segment.
-- is_conflict = false → normal gating (default).

ALTER TABLE public.storylets
  ADD COLUMN IF NOT EXISTS is_conflict boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.storylets.is_conflict IS
  'When true, this beat surfaces as a conflict event when the player''s '
  'daily hours budget is tight (hours_remaining < 4). Overrides normal '
  'segment gating.';
