-- Add reaction_text to s1_dorm_wake_dislocation choices.

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'ask_dana_sleep' THEN
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$Dana blinks, then gives a small, honest smile.
"Not great, but good enough."
She folds the catalog in half like she’s done this before.$$
          ::text
          )
        )
      WHEN choice->>'id' = 'comment_poster' THEN
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$Dana looks up at it, squinting.
"Huh. I don’t remember them putting those up."
You both stare a beat too long.$$ 
          ::text
          )
        )
      WHEN choice->>'id' = 'find_dining_hall' THEN
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$Dana nods fast, relieved.
"Yes. Before it turns into a line."
She grabs her keys like she already knows the route.$$ 
          ::text
          )
        )
      WHEN choice->>'id' = 'organize_desk' THEN
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$Dana watches you for a second, then turns back to the catalog.
"Okay. I’ll go grab something."
The room feels a little bigger after she leaves.$$ 
          ::text
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's1_dorm_wake_dislocation';
