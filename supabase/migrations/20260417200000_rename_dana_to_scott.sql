-- Rename roommate NPC from Dana → Scott
-- Fixes: npc_id (npc_roommate_dana → npc_roommate_scott), prose name, introduces_npc, player state.
-- Internal keys (storylet_key, slug, flag names) are left as-is to avoid breaking save data.

-- ============================================================
-- PART 1: Replace npc_roommate_dana → npc_roommate_scott in all JSONB fields
-- ============================================================

-- storylets.introduces_npc (text[] array)
UPDATE storylets
SET introduces_npc = array_replace(introduces_npc, 'npc_roommate_dana', 'npc_roommate_scott')
WHERE 'npc_roommate_dana' = ANY(introduces_npc);

-- storylets.requirements (deep jsonb)
UPDATE storylets
SET requirements = replace(requirements::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb
WHERE requirements::text LIKE '%npc_roommate_dana%';

-- storylets.choices (jsonb — npc_id refs, events_emitted, relational_effects, set_npc_memory)
UPDATE storylets
SET choices = replace(choices::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb
WHERE choices::text LIKE '%npc_roommate_dana%';

-- daily_states.relationships (player data — rename the key)
UPDATE daily_states
SET relationships = (relationships - 'npc_roommate_dana') || jsonb_build_object('npc_roommate_scott', relationships->'npc_roommate_dana')
WHERE relationships ? 'npc_roommate_dana';

-- daily_states.npc_memory (legacy field)
UPDATE daily_states
SET npc_memory = (npc_memory - 'npc_roommate_dana') || jsonb_build_object('npc_roommate_scott', npc_memory->'npc_roommate_dana')
WHERE npc_memory IS NOT NULL AND npc_memory ? 'npc_roommate_dana';

-- choice_log entries (if any reference the old npc_id)
UPDATE choice_log
SET choice_data = replace(choice_data::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb
WHERE choice_data::text LIKE '%npc_roommate_dana%';

-- ============================================================
-- PART 2: Replace "Dana" → "Scott" in prose text (body, choices)
-- ============================================================

-- Body text: straight name replacement
UPDATE storylets
SET body = replace(body, 'Dana', 'Scott')
WHERE body LIKE '%Dana%';

-- Choices JSONB: name replacement in labels, outcome text, reaction_text
UPDATE storylets
SET choices = replace(choices::text, 'Dana', 'Scott')::jsonb
WHERE choices::text LIKE '%Dana%';

-- ============================================================
-- PART 3: Verify — count remaining references (should be zero)
-- ============================================================

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt
  FROM storylets
  WHERE body LIKE '%Dana%'
     OR choices::text LIKE '%Dana%'
     OR choices::text LIKE '%npc_roommate_dana%'
     OR requirements::text LIKE '%npc_roommate_dana%'
     OR 'npc_roommate_dana' = ANY(introduces_npc);

  IF cnt > 0 THEN
    RAISE WARNING 'Still % storylets with Dana/npc_roommate_dana references after migration', cnt;
  END IF;
END $$;
