-- Fix seasons so the arc-one playtest never crosses a season boundary.
-- Season 2 was auto-seeded 28 days after the initial migration and is now
-- active/expiring, triggering performSeasonReset on every fresh page load
-- and wiping the newly-reset daily_states.day_index back to 0.
--
-- Solution: remove Season 2 and extend Season 1 to cover a full year so
-- there is no season transition during the arc-one prototype period.

DELETE FROM public.seasons WHERE season_index = 2;

UPDATE public.seasons
SET ends_at = '2027-01-01'
WHERE season_index = 1;

-- Sync all users who were promoted to season 2 back to season 1 so that
-- performSeasonReset does not fire for them on next load.
UPDATE public.user_seasons
SET
  current_season_index      = 1,
  last_seen_season_index    = 1,
  updated_at                = now()
WHERE current_season_index = 2;
