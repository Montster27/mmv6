-- Fix: remove default_next_key from s_d1_evening_choice so the pool scan
-- can surface morning-after storylets via requires_choice gating instead of
-- always chaining to hall_morning via the override path.
UPDATE public.storylets
SET default_next_key = NULL
WHERE slug = 's_d1_evening_choice';
