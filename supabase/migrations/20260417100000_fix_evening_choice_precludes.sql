-- Fix phantom precludes on evening_choice.
-- Old values referenced non-existent keys (s_d1_evening_*).
-- New values reference the actual morning-after storylet keys.
-- These are redundant with requires_choice gating but document
-- the design intent and will work correctly when runtime preclusion lands.

UPDATE storylets
SET choices = jsonb_set(
  jsonb_set(
    jsonb_set(
      choices,
      '{0,precludes}',
      '["morning_after_cards", "morning_after_union"]'::jsonb
    ),
    '{1,precludes}',
    '["morning_after_party", "morning_after_union"]'::jsonb
  ),
  '{2,precludes}',
  '["morning_after_party", "morning_after_cards"]'::jsonb
)
WHERE storylet_key = 'evening_choice';
