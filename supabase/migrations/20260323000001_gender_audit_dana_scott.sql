-- Gender audit: enforce male dorm + male RA rule
--
-- 1. Dana (roommate) — fix remaining she/her → he/him in storylet body/choices/reactions
-- 2. Sandra → Scott (RA) — rename NPC, fix all pronouns and gendered descriptors
--
-- Priya and other non-dorm NPCs are unaffected (women exist outside the dorm).

-- ============================================================
-- PART 1: Rename npc_ra_sandra → npc_ra_scott in all JSONB fields
-- ============================================================

-- storylets.introduces_npc (text[] array)
UPDATE storylets
SET introduces_npc = array_replace(introduces_npc, 'npc_ra_sandra', 'npc_ra_scott')
WHERE 'npc_ra_sandra' = ANY(introduces_npc);

-- storylets.requirements (deep jsonb — replace as text then cast back)
UPDATE storylets
SET requirements = replace(requirements::text, 'npc_ra_sandra', 'npc_ra_scott')::jsonb
WHERE requirements::text LIKE '%npc_ra_sandra%';

-- storylets.choices (jsonb — contains npc_id references, events_emitted, relational_effects, set_npc_memory)
UPDATE storylets
SET choices = replace(choices::text, 'npc_ra_sandra', 'npc_ra_scott')::jsonb
WHERE choices::text LIKE '%npc_ra_sandra%';

-- daily_states.relationships (player data — rename the key)
UPDATE daily_states
SET relationships = (relationships - 'npc_ra_sandra') || jsonb_build_object('npc_ra_scott', relationships->'npc_ra_sandra')
WHERE relationships ? 'npc_ra_sandra';

-- daily_states.npc_memory (legacy field, same treatment)
UPDATE daily_states
SET npc_memory = (npc_memory - 'npc_ra_sandra') || jsonb_build_object('npc_ra_scott', npc_memory->'npc_ra_sandra')
WHERE npc_memory IS NOT NULL AND npc_memory ? 'npc_ra_sandra';


-- ============================================================
-- PART 2: Fix Sandra → Scott in prose (body text, choice labels, reaction text)
-- ============================================================

-- Replace "Sandra" with "Scott" in body text
UPDATE storylets
SET body = replace(body, 'Sandra', 'Scott')
WHERE body LIKE '%Sandra%';

-- Replace "Sandra" with "Scott" in choices JSONB (labels, reaction_text, outcome body)
UPDATE storylets
SET choices = replace(choices::text, 'Sandra', 'Scott')::jsonb
WHERE choices::text LIKE '%Sandra%';

-- Replace tokenized Sandra references
UPDATE storylets
SET body = replace(body, '[[npc_ra_sandra]]', '[[npc_ra_scott]]')
WHERE body LIKE '%[[npc_ra_sandra]]%';

UPDATE storylets
SET choices = replace(choices::text, '[[npc_ra_sandra]]', '[[npc_ra_scott]]')::jsonb
WHERE choices::text LIKE '%[[npc_ra_sandra]]%';

-- ============================================================
-- PART 3: Fix Sandra's gendered pronouns → male (she→he, her→his, She→He, Her→His)
-- These target storylets that mention Scott (formerly Sandra)
-- ============================================================

-- Body text: fix pronouns in Sandra/Scott context
-- We do targeted replacements on rows that mention Scott (post-rename)

-- "she " → "he " (lowercase, word boundary via space)
UPDATE storylets SET body = replace(body, 'she ''', 'he ''') WHERE body LIKE '%Scott%' AND body LIKE '%she ''%';
UPDATE storylets SET body = replace(body, 'she''', 'he''') WHERE body LIKE '%Scott%' AND body LIKE '%she''%';

-- "She " at sentence starts
UPDATE storylets SET body = replace(body, 'She ''', 'He ''') WHERE body LIKE '%Scott%' AND body LIKE '%She ''%';
UPDATE storylets SET body = replace(body, 'She''', 'He''') WHERE body LIKE '%Scott%' AND body LIKE '%She''%';

-- "her " → "his " (possessive)
UPDATE storylets SET body = replace(body, 'her ', 'his ') WHERE body LIKE '%Scott%' AND body LIKE '%her %';
UPDATE storylets SET body = replace(body, 'Her ', 'His ') WHERE body LIKE '%Scott%' AND body LIKE '%Her %';

-- "she " (followed by verb, not escaped apostrophe)
UPDATE storylets SET body = replace(body, ' she ', ' he ') WHERE body LIKE '%Scott%' AND body LIKE '% she %';
UPDATE storylets SET body = replace(body, '. She ', '. He ') WHERE body LIKE '%Scott%' AND body LIKE '%. She %';

-- "A woman" → "A guy" in Sandra's intro beat
UPDATE storylets SET body = replace(body, 'A woman with a clipboard', 'A guy with a clipboard') WHERE body LIKE '%A woman with a clipboard%';
UPDATE storylets SET body = replace(body, 'a woman with a clipboard', 'a guy with a clipboard') WHERE body LIKE '%a woman with a clipboard%';

-- "woman" in context of the RA
UPDATE storylets SET body = replace(body, 'the woman running it', 'the guy running it') WHERE body LIKE '%the woman running it%';

-- Choices JSONB: same pronoun fixes for Scott-related content
UPDATE storylets
SET choices = replace(
  replace(
    replace(
      replace(
        replace(
          replace(choices::text, ' she ', ' he '),
        'She ', 'He '),
      'her ', 'his '),
    'Her ', 'His '),
  ' she''', ' he'''),
'She''', 'He''')::jsonb
WHERE choices::text LIKE '%Scott%'
  AND (choices::text LIKE '% she %' OR choices::text LIKE '%her %' OR choices::text LIKE '%She %');


-- ============================================================
-- PART 4: Fix Dana's remaining gendered pronouns → male
-- ============================================================

-- Some older migrations still have Dana as "she/her". Newer ones already use "he/him".
-- Target only rows mentioning Dana.

-- Body text
UPDATE storylets SET body = replace(body, ' she ', ' he ') WHERE body LIKE '%Dana%' AND body LIKE '% she %';
UPDATE storylets SET body = replace(body, '. She ', '. He ') WHERE body LIKE '%Dana%' AND body LIKE '%. She %';
UPDATE storylets SET body = replace(body, 'she''', 'he''') WHERE body LIKE '%Dana%' AND body LIKE '%she''%';
UPDATE storylets SET body = replace(body, 'She''', 'He''') WHERE body LIKE '%Dana%' AND body LIKE '%She''%';
UPDATE storylets SET body = replace(body, 'her bed', 'his bed') WHERE body LIKE '%Dana%' AND body LIKE '%her bed%';
UPDATE storylets SET body = replace(body, 'Her bed', 'His bed') WHERE body LIKE '%Dana%' AND body LIKE '%Her bed%';
UPDATE storylets SET body = replace(body, 'her desk', 'his desk') WHERE body LIKE '%Dana%' AND body LIKE '%her desk%';
UPDATE storylets SET body = replace(body, 'her eyes', 'his eyes') WHERE body LIKE '%Dana%' AND body LIKE '%her eyes%';
UPDATE storylets SET body = replace(body, 'her coat', 'his coat') WHERE body LIKE '%Dana%' AND body LIKE '%her coat%';
UPDATE storylets SET body = replace(body, 'her arms', 'his arms') WHERE body LIKE '%Dana%' AND body LIKE '%her arms%';
UPDATE storylets SET body = replace(body, 'her cassette', 'his cassette') WHERE body LIKE '%Dana%' AND body LIKE '%her cassette%';
UPDATE storylets SET body = replace(body, 'her alarm', 'his alarm') WHERE body LIKE '%Dana%' AND body LIKE '%her alarm%';
UPDATE storylets SET body = replace(body, 'her expression', 'his expression') WHERE body LIKE '%Dana%' AND body LIKE '%her expression%';
UPDATE storylets SET body = replace(body, ' her.', ' him.') WHERE body LIKE '%Dana%' AND body LIKE '% her.%';
UPDATE storylets SET body = replace(body, ' her,', ' him,') WHERE body LIKE '%Dana%' AND body LIKE '% her,%';
UPDATE storylets SET body = replace(body, ' her\n', ' him\n') WHERE body LIKE '%Dana%' AND body LIKE '% her' || chr(10) || '%';

-- Choices JSONB for Dana
UPDATE storylets
SET choices = replace(
  replace(
    replace(
      replace(
        replace(
          replace(choices::text, 'how she slept', 'how he slept'),
        'she should answer', 'he should answer'),
      'she''s taking notes', 'he''s taking notes'),
    'she''s relieved', 'he''s relieved'),
  'she''s already somewhere', 'he''s already somewhere'),
'reach her eyes', 'reach his eyes')::jsonb
WHERE choices::text LIKE '%Dana%'
  AND (choices::text LIKE '%she%' OR choices::text LIKE '%her%');

-- Catch-all: any remaining "her " in Dana choices
UPDATE storylets
SET choices = replace(
  replace(choices::text, ' her ', ' his '),
' her.', ' him.')::jsonb
WHERE choices::text LIKE '%Dana%' AND choices::text LIKE '% her %';

-- ============================================================
-- PART 5: Fix "polo shirt" → gender-neutral description for Scott
-- The original had Sandra wearing "a polo shirt with the college logo"
-- which is fine for a male RA too, so no change needed there.
-- ============================================================

-- "name tag that says SANDRA" → "name tag that says SCOTT"
UPDATE storylets
SET body = replace(body, 'SANDRA', 'SCOTT')
WHERE body LIKE '%SANDRA%';
