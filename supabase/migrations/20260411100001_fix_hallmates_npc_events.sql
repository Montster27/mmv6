-- Fix NPC relationship events in s_d1_dorm_hallmates ("Down the Hall")
--
-- Bug: Mike used NOTICED_FACE in all choices, and the noncommittal choice
-- used NOTICED_FACE for all three NPCs. But the narrative has Doug explicitly
-- introducing everyone by name in every path, Keith giving a handshake and
-- full name, and Mike saying "Hey." These are introductions, not mere sightings.
--
-- Fix: INTRODUCED_SELF for Doug, Mike, and Keith in all three choices.
-- The noncommittal path keeps lower magnitude (0.5) to reflect the player's
-- emotional distance, while still correctly marking them as met.

UPDATE public.storylets
SET choices = jsonb_build_array(
  -- Choice 1: admin_before_lunch
  (choices->0) || jsonb_build_object(
    'events_emitted', jsonb_build_array(
      jsonb_build_object('npc_id', 'npc_floor_doug', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
      jsonb_build_object('npc_id', 'npc_floor_mike', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
      jsonb_build_object('npc_id', 'npc_floor_keith', 'type', 'INTRODUCED_SELF', 'magnitude', 1)
    )
  ),
  -- Choice 2: lunch_first
  (choices->1) || jsonb_build_object(
    'events_emitted', jsonb_build_array(
      jsonb_build_object('npc_id', 'npc_floor_doug', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
      jsonb_build_object('npc_id', 'npc_floor_mike', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
      jsonb_build_object('npc_id', 'npc_floor_keith', 'type', 'INTRODUCED_SELF', 'magnitude', 1)
    )
  ),
  -- Choice 3: noncommittal — player is distant but still hears names
  (choices->2) || jsonb_build_object(
    'events_emitted', jsonb_build_array(
      jsonb_build_object('npc_id', 'npc_floor_doug', 'type', 'INTRODUCED_SELF', 'magnitude', 0.5),
      jsonb_build_object('npc_id', 'npc_floor_mike', 'type', 'INTRODUCED_SELF', 'magnitude', 0.5),
      jsonb_build_object('npc_id', 'npc_floor_keith', 'type', 'INTRODUCED_SELF', 'magnitude', 0.5)
    )
  )
)
WHERE slug = 's_d1_dorm_hallmates';
