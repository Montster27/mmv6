-- Arrival and immediate aftermath are calendar events. Later introductions can
-- happen in a flexible window, but must not replay arrival-day prose.
BEGIN;

UPDATE public.storylets
SET expires_after_days = 0
WHERE storylet_key IN (
  'room_214', 'dorm_hallmates', 'lunch_floor', 'evening_choice',
  'first_morning', 'morning_after_party', 'morning_after_cards',
  'morning_after_union', 'floor_lunch_day2', 'scott_day2_morning',
  'hallway_morning_day3', 'miguel_afternoon_day3'
);

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) ||
  '{"requires_storylets":["room_214"]}'::jsonb
WHERE storylet_key = 'first_morning';

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) ||
  '{"requires_storylets":["dorm_hallmates"]}'::jsonb
WHERE storylet_key = 'lunch_floor';

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) ||
  '{"requires_storylets":["lunch_floor"]}'::jsonb
WHERE storylet_key = 'evening_choice';

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) ||
  '{"requires_any_storylets":["room_214","late_roommate_intro"]}'::jsonb
WHERE storylet_key = 'scott_day2_morning';

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) ||
  '{"requires_any_storylets":["dorm_hallmates","late_hallmates_intro"]}'::jsonb
WHERE storylet_key IN ('floor_lunch_day2', 'hallway_morning_day3', 'miguel_afternoon_day3');

-- Replace a missed opening with a new encounter. These scenes describe the
-- elapsed time honestly and never claim that the player attended orientation.
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, track_id, storylet_key, step_key, order_index,
  due_offset_days, expires_after_days, segment, time_cost_hours
) VALUES (
  'late_roommate_intro', 'The Other Side of Room 214',
  'You have crossed paths with your roommate without finding a moment to talk. This morning he is at the desk, trying to make a stubborn power strip reach the wall. He looks up. “Scott,” he says, as if the introduction is overdue rather than late. He moves a stack of books so you can reach your side of the room.',
  '[{"id":"introduce_yourself","label":"Tell Scott your name","time_cost":0,"energy_cost":0,"outcome":{"text":"He repeats it once, getting it right. The room is still shared, but it feels less anonymous.","deltas":{}},"events_emitted":[{"npc_id":"npc_roommate_scott","type":"INTRODUCED_SELF","magnitude":1}]}]'::jsonb,
  ARRAY['roommate','late_intro'], '{"excludes_storylets":["room_214"]}'::jsonb,
  90, true, ARRAY['npc_roommate_scott']::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'late_roommate_intro', 'late_roommate_intro', 2, 1, 2, 'morning', 0
), (
  'late_hallmates_intro', 'Names in the Hall',
  'The hall has begun to sort itself into small habits. Three people are at the bulletin board, arguing about whether a handwritten notice belongs over the fire-drill schedule. One introduces himself as Doug. The others are Mike and Keith. They make room for you without asking where you have been.',
  '[{"id":"meet_the_floor","label":"Stay and learn their names","time_cost":0,"energy_cost":0,"outcome":{"text":"The argument moves on. You know which doors to knock on now, if you want to.","deltas":{}},"events_emitted":[{"npc_id":"npc_floor_doug","type":"INTRODUCED_SELF","magnitude":1},{"npc_id":"npc_floor_mike","type":"INTRODUCED_SELF","magnitude":1},{"npc_id":"npc_floor_keith","type":"INTRODUCED_SELF","magnitude":1}]}]'::jsonb,
  ARRAY['belonging','late_intro'], '{"excludes_storylets":["dorm_hallmates"]}'::jsonb,
  90, true, ARRAY['npc_floor_doug','npc_floor_mike','npc_floor_keith']::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'late_hallmates_intro', 'late_hallmates_intro', 2, 1, 2, 'morning', 0
), (
  'first_evening_alone', 'A Night of Your Own',
  'The first evening settles over campus. Voices rise from the hall and fade again. No one has made a claim on your time. The room, the paths outside, and the hours ahead are yours to choose.',
  '[{"id":"walk_campus","label":"Walk the lit paths","time_cost":1,"energy_cost":0,"identity_tags":["curiosity"],"outcome":{"text":"The library windows stay bright after the rest of the quad goes dark. You learn the shape of the paths without needing to explain yourself to anyone.","deltas":{"stress":-1}}},{"id":"settle_in","label":"Stay in and make the room yours","time_cost":0,"energy_cost":0,"identity_tags":["safety"],"outcome":{"text":"You find places for the things still in your bag. Outside, other people’s plans continue. Yours can wait until morning.","deltas":{"energy":1}}}]'::jsonb,
  ARRAY['belonging','arrival','quiet'], '{"excludes_storylets":["lunch_floor"]}'::jsonb,
  80, true, ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'first_evening_alone', 'first_evening_alone', 4, 0, 0, 'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  introduces_npc = EXCLUDED.introduces_npc, track_id = EXCLUDED.track_id,
  storylet_key = EXCLUDED.storylet_key, step_key = EXCLUDED.step_key,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours, is_active = EXCLUDED.is_active;

-- An optional Glenn encounter cannot be presumed in a belonging scene.
UPDATE public.storylets
SET body = regexp_replace(body,
  'The melody is still in your head\.[^\n]*\n\n', '', 'g')
WHERE storylet_key = 'evening_choice';

UPDATE public.storylets
SET body = replace(body, 'You slept well. ', '')
WHERE storylet_key = 'morning_after_cards';

-- The first period-friction beat cannot remember prior instances of itself.
UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE WHEN node->>'id' = 'hallway_comment' THEN node - 'text_variants' ELSE node END
    ORDER BY ordinal
  )
  FROM jsonb_array_elements(nodes) WITH ORDINALITY AS entry(node, ordinal)
)
WHERE storylet_key = 'hallway_morning_day3' AND nodes IS NOT NULL;

-- The quarter invitation had no scheduled follow-up. Keep the social opening
-- without recording a promise the game cannot honor.
UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE WHEN node->>'id' = 'mike_offer' THEN
      jsonb_set(
        jsonb_set(node, '{text}', to_jsonb('"Peterson has been talking about another card game this week. Quarter buy-in, if it happens." Mike says it like he is reading a bus schedule. There is an invitation in there, buried under the delivery.'::text)),
        '{micro_choices}', (
          SELECT jsonb_agg(
            CASE WHEN choice->>'id' = 'commit' THEN
              (choice - 'sets_flag' - 'set_npc_memory') ||
              '{"label":"Let me know when it starts"}'::jsonb
            ELSE choice END ORDER BY choice_order
          )
          FROM jsonb_array_elements(node->'micro_choices') WITH ORDINALITY AS micro(choice, choice_order)
        )
      )
    ELSE node END ORDER BY ordinal
  )
  FROM jsonb_array_elements(nodes) WITH ORDINALITY AS entry(node, ordinal)
)
WHERE storylet_key = 'morning_after_cards' AND nodes IS NOT NULL;

-- Canonicalize stale roommate introductions without changing past choices.
UPDATE public.storylets
SET introduces_npc = array_replace(introduces_npc, 'npc_roommate_dana', 'npc_roommate_scott'),
    choices = replace(choices::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb,
    nodes = CASE WHEN nodes IS NULL THEN NULL ELSE replace(nodes::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb END
WHERE storylet_key = 'room_214';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.storylets WHERE storylet_key IN
      ('room_214','dorm_hallmates','lunch_floor','evening_choice','first_morning',
       'morning_after_cards','hallway_morning_day3')) <> 7 THEN
    RAISE EXCEPTION 'Opening timing rebuild: required storylet rows are missing';
  END IF;
END $$;

COMMIT;
