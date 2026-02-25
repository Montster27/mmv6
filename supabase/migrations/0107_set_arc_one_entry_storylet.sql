-- Force Arc One entry storylet to be "The Room That Fits Too Well".

-- Remove entry tag from any other Arc One storylets.
UPDATE public.storylets
SET tags = array_remove(tags, 'entry:arc_one_core')
WHERE tags @> ARRAY['arc_one_core']::text[];

-- Ensure the intended storylet is tagged as the entry node.
UPDATE public.storylets
SET tags = (
  SELECT array(SELECT DISTINCT unnest(tags || ARRAY['entry:arc_one_core']::text[]))
)
WHERE slug = 's1_dorm_wake_dislocation';
