-- Phase 1: Skill Queue — skill_definitions + player_skills
-- Reversible: DROP TABLE IF EXISTS at bottom in a comment block.

-- ==========================================================================
-- 1. skill_definitions (static catalog)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.skill_definitions (
  skill_id       TEXT PRIMARY KEY,
  display_name   TEXT NOT NULL,
  tier           SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
  domain         TEXT NOT NULL,
  base_train_seconds INTEGER NOT NULL,
  prerequisite_skill_ids TEXT[] DEFAULT '{}'::TEXT[],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_definitions ENABLE ROW LEVEL SECURITY;

-- Everyone can read the skill catalog
CREATE POLICY "skill_definitions_read" ON public.skill_definitions
  FOR SELECT USING (true);

-- ==========================================================================
-- 2. player_skills (per-user training state)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.player_skills (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id      TEXT NOT NULL REFERENCES public.skill_definitions(skill_id),
  status        TEXT NOT NULL CHECK (status IN ('trained', 'active', 'queued', 'locked')),
  started_at    TIMESTAMPTZ,
  completes_at  TIMESTAMPTZ,
  trained_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id)
);

-- Index for fast "what is this user training?" lookups
CREATE INDEX idx_player_skills_user_status ON public.player_skills (user_id, status);

ALTER TABLE public.player_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_skills_select_own" ON public.player_skills
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "player_skills_insert_own" ON public.player_skills
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "player_skills_update_own" ON public.player_skills
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "player_skills_delete_own" ON public.player_skills
  FOR DELETE USING (user_id = auth.uid());

-- ==========================================================================
-- 3. Application-level guard: at most 1 active + 1 queued per user.
--    Enforced via partial unique indexes (Postgres trick).
-- ==========================================================================

CREATE UNIQUE INDEX idx_player_skills_one_active
  ON public.player_skills (user_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX idx_player_skills_one_queued
  ON public.player_skills (user_id)
  WHERE status = 'queued';

-- ==========================================================================
-- 4. Seed 10 Tier 1 skills
--    base_train_seconds = 14400 (4 hours) — matches baseTrainSeconds(1)
-- ==========================================================================

INSERT INTO public.skill_definitions (skill_id, display_name, tier, domain, base_train_seconds, prerequisite_skill_ids)
VALUES
  ('critical_analysis',  'Critical Analysis',  1, 'Academic',  14400, '{}'),
  ('close_reading',      'Close Reading',      1, 'Academic',  14400, '{}'),
  ('active_listening',   'Active Listening',   1, 'Social',    14400, '{}'),
  ('small_talk',         'Small Talk',         1, 'Social',    14400, '{}'),
  ('running_endurance',  'Running Endurance',  1, 'Physical',  14400, '{}'),
  ('manual_dexterity',   'Manual Dexterity',   1, 'Physical',  14400, '{}'),
  ('creative_writing',   'Creative Writing',   1, 'Creative',  14400, '{}'),
  ('musical_ear',        'Musical Ear',        1, 'Creative',  14400, '{}'),
  ('tool_proficiency',   'Tool Proficiency',   1, 'Technical', 14400, '{}'),
  ('budgeting',          'Budgeting',          1, 'Practical', 14400, '{}')
ON CONFLICT (skill_id) DO NOTHING;

-- ==========================================================================
-- Rollback (run manually if needed):
--   DROP TABLE IF EXISTS public.player_skills;
--   DROP TABLE IF EXISTS public.skill_definitions;
-- ==========================================================================
