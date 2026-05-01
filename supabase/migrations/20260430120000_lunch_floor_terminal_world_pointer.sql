-- ============================================================================
-- Add world-pointer to the ARPANET terminal in lunch_floor.evening_pitch
-- ============================================================================
-- T-1777320000011 (Add secondary world-pointer to the terminal).
--
-- Belt-and-suspenders for terminal discoverability. Doug delivers a casual,
-- diegetic mention of the Whitmore basement computer lab during the lunch
-- conversation that already discusses tonight's plans. The mention is
-- background texture, not a directive — a player who heard Glenn perks up
-- at it; a player who didn't hears it as random dorm chatter.
--
-- Caveat: independently of this content, T-1777564800228 tracks a separate
-- bug where terminal_first_visit is not actually served by the scheduler
-- even when its eligibility flag is set. This world-pointer becomes fully
-- effective only once that scheduler bug is resolved.
--
-- Implementation
-- --------------
-- Surgical UPDATE on the `evening_pitch` element of lunch_floor.nodes via
-- jsonb_array_elements + CASE + jsonb_agg (matches the pattern established
-- in 20260413100000_retrofit_lunch_floor_nodes.sql).
--
-- The update changes only `evening_pitch`:
--   • body text gains 1 sentence in Doug's voice — Bryce / printer / Whitmore
--   • text_variants array adds one variant gated on
--     npc_memory: npc_contact_glenn.found_terminal
--     (player who has been to the terminal hears Doug's line with
--     recognition; the variant adds 3 short sentences of internal
--     acknowledgment, Doug's words unchanged)
--
-- Rollback: re-run 20260413100000 (its nodes block is the same minus this
-- migration's additions).

BEGIN;

UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'evening_pitch' THEN
        elem
        || jsonb_build_object(
          'text',
          $body$Mike finishes chewing, puts his fork down. "Anyone figure out their schedule yet? I've got Chem 101 at eight AM on Tuesdays."

"Eight AM? That's punishment," Doug says.

"It's the section with Hadley. She's supposed to be good." Mike says it like he's already researched every professor.

Doug grins. "Bryce was up in the CS lab last night. Said the printer ate his econ paper. Whitmore basement, if you ever need to print anything." He leans back. "So tonight. First night, we gotta do something. I heard there's a thing at Anderson Hall — a guy on third floor is throwing a party. Beer, girls from the other dorms."

"There's also some guys on our floor doing cards in the lounge," Mike says. "Quieter."

Scott: "Both sound good." Of course they do.

The meal is done. The afternoon opens up. Tonight you'll have to choose.$body$
        )
        || jsonb_build_object(
          'text_variants',
          $variants$[
            {
              "condition": { "npc_memory": "npc_contact_glenn.found_terminal" },
              "text": "Mike finishes chewing, puts his fork down. \"Anyone figure out their schedule yet? I've got Chem 101 at eight AM on Tuesdays.\"\n\n\"Eight AM? That's punishment,\" Doug says.\n\n\"It's the section with Hadley. She's supposed to be good.\" Mike says it like he's already researched every professor.\n\nDoug grins. \"Bryce was up in the CS lab last night. Said the printer ate his econ paper. Whitmore basement, if you ever need to print anything.\" He leans back. \"So tonight. First night, we gotta do something. I heard there's a thing at Anderson Hall — a guy on third floor is throwing a party. Beer, girls from the other dorms.\"\n\nYou've been down there. The amber light, the grad student. Doug doesn't know that. He says \"Whitmore basement\" like it's a printer location, nothing more.\n\n\"There's also some guys on our floor doing cards in the lounge,\" Mike says. \"Quieter.\"\n\nScott: \"Both sound good.\" Of course they do.\n\nThe meal is done. The afternoon opens up. Tonight you'll have to choose."
            }
          ]$variants$::jsonb
        )
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(nodes::jsonb) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'lunch_floor'
  AND is_active = true;

COMMIT;
