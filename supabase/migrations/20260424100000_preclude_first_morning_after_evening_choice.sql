-- 2026-04-24 — Add `first_morning` to evening_choice option precludes.
--
-- Background: first_morning is the Day 1 chain-override (from room_214)
-- and is never self-clearing unless resolved. After a player commits to an
-- evening_choice option (Anderson Hall party, cards game, or union arcade),
-- first_morning must not re-surface — the morning_after_* residue storylet
-- takes its place.
--
-- Paired with the chain-override preclusion check in
-- src/core/tracks/selectTrackStorylets.ts: when next_key_override points at
-- a precluded storylet, the chain falls through to the pool so the residue
-- storylet can land.

UPDATE storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'go_to_party'
        THEN jsonb_set(choice, '{precludes}', '["morning_after_cards","morning_after_union","first_morning"]'::jsonb)
      WHEN choice->>'id' = 'go_to_cards'
        THEN jsonb_set(choice, '{precludes}', '["morning_after_party","morning_after_union","first_morning"]'::jsonb)
      WHEN choice->>'id' = 'go_to_union'
        THEN jsonb_set(choice, '{precludes}', '["morning_after_party","morning_after_cards","first_morning"]'::jsonb)
      ELSE choice
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS arr(choice, ord)
)
WHERE storylet_key = 'evening_choice';

-- Verify: each option's precludes array now has three entries incl. first_morning
DO $$
DECLARE
  bad INT;
BEGIN
  SELECT count(*) INTO bad
  FROM storylets s, jsonb_array_elements(s.choices) c
  WHERE s.storylet_key = 'evening_choice'
    AND NOT (c->'precludes' ? 'first_morning');
  IF bad > 0 THEN
    RAISE EXCEPTION 'evening_choice has % option(s) missing first_morning in precludes', bad;
  END IF;
END $$;
