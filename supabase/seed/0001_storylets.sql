-- Seed storylets for Phase One (run in Supabase SQL Editor)
insert into public.storylets (slug, title, body, choices, tags, is_active)
values
  (
    'campus-green-echo',
    'Echo on the Green',
    'A late afternoon on the campus green. A payphone rings even though no one called.',
    '[{"id":"A","label":"Answer the payphone","effects":{"stress":1,"energy":-2},"flags":["heard_echo"]},{"id":"B","label":"Let it ring","effects":{"stress":-1,"energy":0},"flags":[]}]'::jsonb,
    '{evening,phone}',
    true
  ),
  (
    'library-flicker',
    'Flicker in the Stacks',
    'In the basement stacks, a fluorescent bulb hums and flickers while a draft turns pages.',
    '[{"id":"A","label":"Investigate the flicker","effects":{"stress":1,"energy":-3},"flags":["saw_flicker"]},{"id":"B","label":"Head back upstairs","effects":{"stress":0,"energy":0},"flags":[]}]'::jsonb,
    '{library,quiet}',
    true
  ),
  (
    'lab-spill',
    'Spill in Lab 3B',
    'Someone left an unmarked vial open. A sweet, metallic scent hangs in the air.',
    '[{"id":"A","label":"Seal the vial","effects":{"stress":0,"energy":-1},"flags":["sealed_vial"]},{"id":"B","label":"Call campus safety","effects":{"stress":-1,"energy":0},"flags":["reported_spill"]}]'::jsonb,
    '{lab,safety}',
    true
  ),
  (
    'dorm-knock',
    'Knock at Midnight',
    'Three knocks on your dorm door. No one is scheduled to visit.',
    '[{"id":"A","label":"Open the door","effects":{"stress":2,"energy":-1},"flags":["opened_door"]},{"id":"B","label":"Stay silent","effects":{"stress":0,"energy":1},"flags":[]}]'::jsonb,
    '{dorm,night}',
    true
  );

-- Season gating examples
update public.storylets
  set requirements = '{"seasons_any":[1]}'::jsonb
  where slug in ('campus-green-echo', 'library-flicker');

update public.storylets
  set requirements = '{"min_season_index":2}'::jsonb
  where slug in ('lab-spill', 'dorm-knock');
