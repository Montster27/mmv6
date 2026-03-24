-- Add mini_game field to the three evening event choices.
-- Each choice triggers a different mini-game before outcome resolves.

BEGIN;

-- Update each choice in the s01_evening_choice storylet to include mini_game
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'go_to_caps' THEN
        elem || '{"mini_game": {"type": "caps", "config": {}}}'::jsonb
      WHEN elem->>'id' = 'go_to_cards' THEN
        elem || '{"mini_game": {"type": "memory", "config": {}}}'::jsonb
      WHEN elem->>'id' = 'go_to_sub' THEN
        elem || '{"mini_game": {"type": "snake", "config": {}}}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(choices) AS elem
)
WHERE slug = 's01_evening_choice';

COMMIT;
