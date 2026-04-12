-- ================================================================
-- Phase 4: Routine-Week Mode
-- Creates routine_activities (catalog), player_routine_schedules
-- (per-user committed schedules), and routine_week_state (per-user
-- weekly state machine). Seeds 6 standing activities for Week 2.
--
-- Idempotent: uses IF NOT EXISTS and ON CONFLICT.
-- Reversible: DROP TABLE IF EXISTS at the bottom (commented out).
-- ================================================================

-- ============================================================
-- 1. routine_activities — standing activity catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_activities (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_key      TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN (
    'academic', 'creative', 'social', 'physical', 'practical', 'work'
  )),
  half_day_cost     SMALLINT NOT NULL CHECK (half_day_cost > 0),
  requirements      JSONB DEFAULT NULL,
  npc_deposits      JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_practice_ids TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  flavor_text       TEXT NOT NULL DEFAULT '',
  interruption_hooks TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'routine_activities' AND policyname = 'routine_activities_read'
  ) THEN
    CREATE POLICY routine_activities_read ON public.routine_activities
      FOR SELECT USING (true);
  END IF;
END $$;

-- ── Seed 6 Week 2 activities ──

INSERT INTO public.routine_activities
  (activity_key, display_name, category, half_day_cost, requirements,
   npc_deposits, skill_practice_ids, flavor_text, interruption_hooks)
VALUES
  (
    'attend_classes',
    'Attend Classes',
    'academic',
    2,
    NULL,
    '[]'::jsonb,
    ARRAY['critical_analysis', 'close_reading'],
    'Three classes a week. Heller''s section is the one you actually look forward to.',
    ARRAY['academic_threshold']
  ),
  (
    'library_study',
    'Library Study',
    'academic',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY['critical_analysis'],
    'The third floor is quieter than the second.',
    ARRAY['academic_threshold']
  ),
  (
    'herald_meetings',
    'Herald Meetings',
    'creative',
    1,
    '{"requires_flag": "herald_intro"}'::jsonb,
    '[{"npc_id": "npc_herald_karen", "type": "SHOWED_UP", "magnitude": 1}]'::jsonb,
    ARRAY['creative_writing'],
    'Tuesday nights, Union 204.',
    ARRAY['karen_threshold']
  ),
  (
    'dorm_floor_time',
    'Hang on the Floor',
    'social',
    1,
    NULL,
    '[{"npc_id": "npc_roommate_scott", "type": "SHOWED_UP", "magnitude": 1}, {"npc_id": "npc_floor_mike", "type": "SHOWED_UP", "magnitude": 1}, {"npc_id": "npc_floor_spider", "type": "SHOWED_UP", "magnitude": 1}]'::jsonb,
    ARRAY['small_talk', 'active_listening'],
    'Doors propped open. Whoever''s around.',
    ARRAY['scott_reliability', 'floor_social']
  ),
  (
    'running',
    'Running',
    'physical',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY['running_endurance'],
    'The loop around the reservoir is two miles.',
    ARRAY[]::TEXT[]
  ),
  (
    'library_shift',
    'Library Shift',
    'work',
    2,
    '{"requires_flag": "has_job_library"}'::jsonb,
    '[{"npc_id": "npc_librarian_doerr", "type": "SHOWED_UP", "magnitude": 1}]'::jsonb,
    ARRAY['budgeting'],
    'Six dollars an hour. Mostly shelving.',
    ARRAY['money_income']
  )
ON CONFLICT (activity_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  half_day_cost = EXCLUDED.half_day_cost,
  requirements = EXCLUDED.requirements,
  npc_deposits = EXCLUDED.npc_deposits,
  skill_practice_ids = EXCLUDED.skill_practice_ids,
  flavor_text = EXCLUDED.flavor_text,
  interruption_hooks = EXCLUDED.interruption_hooks;


-- ============================================================
-- 2. player_routine_schedules — committed weekly schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_routine_schedules (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diegetic_week_start   INTEGER NOT NULL,
  activity_key          TEXT NOT NULL REFERENCES public.routine_activities(activity_key),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, diegetic_week_start, activity_key)
);

CREATE INDEX IF NOT EXISTS idx_prs_user_week
  ON public.player_routine_schedules (user_id, diegetic_week_start);

ALTER TABLE public.player_routine_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_routine_schedules' AND policyname = 'prs_select_own'
  ) THEN
    CREATE POLICY prs_select_own ON public.player_routine_schedules
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_routine_schedules' AND policyname = 'prs_insert_own'
  ) THEN
    CREATE POLICY prs_insert_own ON public.player_routine_schedules
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_routine_schedules' AND policyname = 'prs_delete_own'
  ) THEN
    CREATE POLICY prs_delete_own ON public.player_routine_schedules
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;


-- ============================================================
-- 3. routine_week_state — per-user weekly state machine
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_week_state (
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diegetic_week_start           INTEGER NOT NULL,
  status                        TEXT NOT NULL DEFAULT 'scheduling'
                                CHECK (status IN ('scheduling','committed','interrupted','completed')),
  committed_at                  TIMESTAMPTZ,
  current_week_day              SMALLINT NOT NULL DEFAULT 0,
  interruption_storylet_key     TEXT DEFAULT NULL,
  interruption_reason           TEXT DEFAULT NULL
                                CHECK (interruption_reason IS NULL OR interruption_reason IN (
                                  'gate_threshold', 'calendar_beat', 'npc_patience'
                                )),
  interruption_day              SMALLINT DEFAULT NULL,
  deposits_applied_through_day  SMALLINT NOT NULL DEFAULT -1,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, diegetic_week_start)
);

ALTER TABLE public.routine_week_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'routine_week_state' AND policyname = 'rws_select_own'
  ) THEN
    CREATE POLICY rws_select_own ON public.routine_week_state
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'routine_week_state' AND policyname = 'rws_insert_own'
  ) THEN
    CREATE POLICY rws_insert_own ON public.routine_week_state
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'routine_week_state' AND policyname = 'rws_update_own'
  ) THEN
    CREATE POLICY rws_update_own ON public.routine_week_state
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;


-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP TABLE IF EXISTS public.routine_week_state;
-- DROP TABLE IF EXISTS public.player_routine_schedules;
-- DROP TABLE IF EXISTS public.routine_activities;
