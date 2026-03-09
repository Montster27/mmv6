-- narrative_3: Clear all existing storylets, arcs, and player data
-- This resets the content slate for the new narrative structure.

BEGIN;

-- Clear player progress / runtime data
DELETE FROM public.choice_log;
DELETE FROM public.chapter_summaries;
DELETE FROM public.player_dispositions;
DELETE FROM public.arc_offers;
DELETE FROM public.arc_instances;

-- Clear stream_states from daily_states
UPDATE public.daily_states SET stream_states = '{}'::jsonb;

-- Clear relationships from daily_states so NPCs re-initialize
UPDATE public.daily_states SET relationships = '{}'::jsonb;

-- Clear storylets (must go before arc_definitions due to FK)
DELETE FROM public.storylets;

-- Clear arc definitions
DELETE FROM public.arc_definitions;

COMMIT;
