-- Compress tier-1 skill training durations for browser playtest.
--
-- Background: the training-time scaling env var (NEXT_PUBLIC_SKILL_TIME_SCALE)
-- in src/core/skills/curve.ts is exported but never imported by the queue
-- engine or the /api/skill-queue/train route. Both read base_train_seconds
-- directly from skill_definitions, so the DB column is the only knob that
-- actually affects training duration. This migration writes per-skill values
-- so a tester can observe a tier-1 skill complete in 2–5 minutes instead of
-- 4 hours. Pre-launch tuning will replace these with real curves.
--
-- Mapping (seed order from 20260410200000_skill_queue_phase1.sql):
--   First 3  → 120 s (2 minutes)
--     critical_analysis, close_reading, active_listening
--   Remaining 7 → 300 s (5 minutes)
--     small_talk, running_endurance, manual_dexterity,
--     creative_writing, musical_ear, tool_proficiency, budgeting

BEGIN;

UPDATE public.skill_definitions
SET base_train_seconds = 120
WHERE skill_id IN ('critical_analysis', 'close_reading', 'active_listening')
  AND tier = 1;

UPDATE public.skill_definitions
SET base_train_seconds = 300
WHERE skill_id IN (
    'small_talk',
    'running_endurance',
    'manual_dexterity',
    'creative_writing',
    'musical_ear',
    'tool_proficiency',
    'budgeting'
  )
  AND tier = 1;

COMMIT;
