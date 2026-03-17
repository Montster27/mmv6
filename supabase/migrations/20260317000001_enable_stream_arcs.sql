-- 20260317000001_enable_stream_arcs.sql
-- Ensure all six Week 1 stream arcs are enabled.
-- 0138 used ON CONFLICT DO NOTHING, which skips updates on existing rows.
-- This migration forces is_enabled=true for all stream arc definitions.

UPDATE public.arc_definitions
SET is_enabled = true
WHERE key IN (
  'arc_roommate',
  'arc_academic',
  'arc_money',
  'arc_belonging',
  'arc_opportunity',
  'arc_home'
);
