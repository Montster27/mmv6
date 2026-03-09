-- 0140_add_introduces_npc_to_storylets.sql
-- Add introduces_npc column to storylets.
-- This field was added to the Storylet TypeScript type in ea02159 but the
-- DB column was never created. Arc steps that introduce NPCs have this set.

ALTER TABLE public.storylets
  ADD COLUMN IF NOT EXISTS introduces_npc text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.storylets.introduces_npc IS
  'NPC keys introduced in this storylet. Used to suppress name-leak warnings and inject first-encounter blurbs.';
