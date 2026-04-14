-- first_morning had expires_after_days = NULL, which the engine defaults to 0,
-- giving it only a 1-day eligibility window. Widen to 7 days to match other
-- Week 1 storylets and prevent it from being silently skipped.
UPDATE storylets
SET expires_after_days = 7
WHERE storylet_key = 'first_morning'
  AND expires_after_days IS NULL;
