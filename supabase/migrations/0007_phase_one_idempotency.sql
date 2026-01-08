-- Idempotency and uniqueness guards for Phase One.
-- Ensure storylet_runs cannot duplicate the same storylet for a user/day.

create unique index if not exists storylet_runs_user_day_storylet_idx
  on public.storylet_runs (user_id, day_index, storylet_id);

-- time_allocations already unique (user_id, day_index) in earlier migration.
-- Social boosts once-per-day is enforced in app logic; boost payload stores day_index (not a column), so DB uniqueness is deferred (consider explicit column in future if needed).
