-- Enforce day_index >= 1 on daily_states.
--
-- Prior to this constraint, performSeasonReset (src/core/season/seasonReset.ts)
-- and other legacy paths could write day_index = 0, which caused
-- "Day 0 Night stuck" bugs when getOrCreateDailyRun then called
-- createDayStateFromPrevious(userId, 0) and invented a default player_day_state
-- row that the user could never legitimately reach.
--
-- With this CHECK in place, any code path that attempts to write 0 will fail
-- loudly with a constraint violation instead of silently corrupting state.
ALTER TABLE daily_states
  ADD CONSTRAINT daily_states_day_index_nonneg
  CHECK (day_index >= 1);

COMMENT ON CONSTRAINT daily_states_day_index_nonneg ON daily_states IS
  'day_index must be >= 1. Prevents performSeasonReset and legacy paths from accidentally writing 0, which caused Day 0 stuck-state bugs (see 2026-04-23 incident).';
