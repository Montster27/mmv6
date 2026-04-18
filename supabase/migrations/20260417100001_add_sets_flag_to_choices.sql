-- Add sets_flag to choices that gate downstream storylets via requires_flag.
-- These were missing — the requires_flag values existed on storylets but
-- no choice ever set them.

-- Glenn chain: pastime_paradise → terminal_first_visit → glenn_the_walk
-- head_to_evening on glenn_pastime_paradise sets glenn_gave_direction
UPDATE storylets
SET choices = jsonb_set(
  choices,
  '{0,sets_flag}',
  '["glenn_gave_direction"]'::jsonb
)
WHERE storylet_key = 'glenn_pastime_paradise';

-- leave_terminal on terminal_first_visit sets found_terminal (success path)
-- turned_away_leave does NOT set found_terminal (miss path)
UPDATE storylets
SET choices = jsonb_set(
  choices,
  '{0,sets_flag}',
  '["found_terminal"]'::jsonb
)
WHERE storylet_key = 'terminal_first_visit';
-- Index 0 = leave_terminal, index 1 = turned_away_leave (verified via DB query)
