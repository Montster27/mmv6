-- Migration 0123: Add preclusion_gates column to daily_states
--
-- Implements the Design Bible's preclusion mechanic: when a player makes
-- choice X, door Y closes permanently in that run. This column stores the
-- set of storylet slugs (and gate keys) that have been closed by prior
-- choices. selectStorylets checks against this list via requires_not_precluded
-- on the storylet's requirements field.

ALTER TABLE public.daily_states
ADD COLUMN IF NOT EXISTS preclusion_gates jsonb DEFAULT '[]'::jsonb;
