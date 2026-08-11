-- Corrective copy pass following the deployed first-three-days playtest.

BEGIN;

-- The player has said the administrative errand comes first. Avoid implying
-- the opposite while retaining Doug's lightly needling response.
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'id' = 'admin_before_lunch'
      THEN jsonb_set(elem, '{reaction_text}', to_jsonb(
        '“Responsible,” Doug says, halfway between praise and accusation. “Eleven-thirty, then.” He is already walking backward down the hall, still talking.'::text))
      ELSE elem
    END ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'dorm_hallmates' AND is_active = true;

-- Repair truncated and unpunctuated dining-hall prose.
UPDATE public.storylets
SET
  body = CASE
    WHEN body LIKE '%whether you planned to or not.%' THEN body
    ELSE replace(
      body,
      'which means sitting with people whether you planned',
      'which means sitting with people whether you planned to or not.'
    )
  END,
  nodes = replace(
    nodes::text,
    'back home\" No edge.',
    'back home.\" No edge.'
  )::jsonb
WHERE storylet_key = 'lunch_floor' AND is_active = true;

-- The conversational choice already records the player's response. Present a
-- single follow-through button instead of asking the same question twice.
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE elem->>'id'
      WHEN 'laugh_with_doug' THEN
        jsonb_set(
          jsonb_set(elem, '{label}', to_jsonb('Clear your tray and head out'::text)),
          '{reaction_text}',
          to_jsonb(substring(elem->>'reaction_text' from position(E'\n\n' in elem->>'reaction_text') + 2))
        )
      WHEN 'catch_keiths_eye' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(elem, '{label}', to_jsonb('Clear your tray and head out'::text)),
            '{reaction_text}',
            to_jsonb(substring(elem->>'reaction_text' from position(E'\n\n' in elem->>'reaction_text') + 2))
          ),
          '{requires_flag}', to_jsonb('sided_with_keith'::text)
        )
      WHEN 'focus_on_food' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(elem, '{label}', to_jsonb('Clear your tray and head out'::text)),
            '{reaction_text}',
            to_jsonb(substring(elem->>'reaction_text' from position(E'\n\n' in elem->>'reaction_text') + 2))
          ),
          '{requires_flag}', to_jsonb('stayed_quiet'::text)
        )
      ELSE elem
    END ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'lunch_floor' AND is_active = true;

-- Correct the song title and restore the missing sentence boundary.
UPDATE public.storylets
SET body = replace(
             replace(body, 'Pastimes Paradise', 'Pastime Paradise'),
             'But the voice is wrong  Something',
             'But the voice is wrong. Something'
           )
WHERE storylet_key = 'glenn_pastime_paradise' AND is_active = true;

-- Make the cassette callback observable rather than claiming an exchange that
-- never happened on screen.
UPDATE public.storylets
SET nodes = replace(
  nodes::text,
  'he asks, watching to see whether you remember the rest of the conversation.',
  'His thumb rests on the cracked plastic hinge.'
)::jsonb
WHERE storylet_key = 'first_morning' AND is_active = true;

UPDATE public.routine_activities
SET flavor_text = 'Stay in Room 214 while the floor drifts past. Scott may stop by. So may someone you have not met yet.'
WHERE activity_key = 'dorm_floor_time';

COMMIT;
