-- Follow-up audit of live dialogue and outcome text. A named weekday, class
-- meeting, first shift, or fixed appointment cannot float in a broad pool.
BEGIN;

UPDATE public.storylets
SET expires_after_days = 0
WHERE storylet_key IN (
  'western_civ_day1', 'reading_or_lounge', 'second_morning_class',
  'roommate_evening_day3', 'catch_up_or_coast',
  'tuesday_commitment', 'tuesday_night_study', 'tuesday_night_terminal',
  'tuesday_night_dana_movie', 'tuesday_night_shift', 'the_post'
);

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) ||
  '{"requires_any_storylets":["room_214","late_roommate_intro"]}'::jsonb
WHERE storylet_key = 'roommate_evening_day3';

-- The ordinary roommate evening is valid after either introduction, but the
-- note is conditional and cannot be treated as common history.
UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE WHEN node->>'id' = 'notice_writing' THEN
      jsonb_set(node, '{text}', to_jsonb(replace(node->>'text',
        'The handwriting is the same careful print from the note he left you yesterday.',
        'His handwriting is careful, each letter given its own space.')::text))
    ELSE node END ORDER BY ordinal
  )
  FROM jsonb_array_elements(nodes) WITH ORDINALITY AS entry(node, ordinal)
)
WHERE storylet_key = 'roommate_evening_day3' AND nodes IS NOT NULL;

-- The Glenn scene costs no time by itself and may be followed by another
-- afternoon encounter. Do not claim the rest of that afternoon already passed.
UPDATE public.storylets
SET nodes = replace(nodes::text, 'For the rest of the afternoon,', 'For a while,')::jsonb
WHERE storylet_key = 'glenn_pastime_paradise' AND nodes IS NOT NULL;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.storylets WHERE storylet_key IN
      ('tuesday_commitment','tuesday_night_study','tuesday_night_terminal',
       'tuesday_night_dana_movie','tuesday_night_shift','the_post')
      AND expires_after_days = 0) <> 6 THEN
    RAISE EXCEPTION 'Tuesday calendar scenes are not all anchored';
  END IF;
END $$;

COMMIT;
