-- Phase 1: Add segment-based time tracking to player_day_state.
--
-- current_segment  : which segment the player is currently in
--                    (morning | afternoon | evening | night | sleeping)
-- hours_remaining  : free hours left today (starts at 16; 8h sleep pre-deducted)
-- hours_committed  : hours locked in for work + class (deducted at day start
--                    based on allocation; reduces hours_remaining floor)

ALTER TABLE public.player_day_state
  ADD COLUMN IF NOT EXISTS current_segment  text    NOT NULL DEFAULT 'morning'
    CHECK (current_segment IN ('morning','afternoon','evening','night','sleeping')),
  ADD COLUMN IF NOT EXISTS hours_remaining  integer NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS hours_committed  integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.player_day_state.current_segment IS
  'Active time segment for this day: morning | afternoon | evening | night | sleeping.';

COMMENT ON COLUMN public.player_day_state.hours_remaining IS
  'Free hours left in the day. Starts at 16 (24h minus 8h sleep pre-deducted). Decremented by beat time_cost_hours and committed blocks.';

COMMENT ON COLUMN public.player_day_state.hours_committed IS
  'Hours blocked for work + class based on allocation choice. Subtracted from hours_remaining at day initialisation.';
