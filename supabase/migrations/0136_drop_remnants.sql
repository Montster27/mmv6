-- Migration 0136: Drop remnant system tables
--
-- The remnant run-carry-over mechanic has been removed from the codebase.
-- Drops the three tables created by migrations 0085 and 0086.
-- Tables 0085: remnant_unlocks, remnant_selections
-- Table  0086: remnant_rules (partial, rest of 0086 is delayed_consequence_rules)

DROP TABLE IF EXISTS public.remnant_rules;
DROP TABLE IF EXISTS public.remnant_selections;
DROP TABLE IF EXISTS public.remnant_unlocks;
