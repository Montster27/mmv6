-- 20260324100000_unify_tracks_and_storylets.sql
-- Rename arc_definitions → tracks, arc_instances → track_progress,
-- add new columns to storylets, migrate data to new naming conventions.
--
-- See docs/TRACK_AND_STORYLET_MODEL.md for the full spec.

-- ============================================================================
-- 1. Create `tracks` table from arc_definitions
-- ============================================================================

-- Add new columns to arc_definitions first (we'll rename the table after)
ALTER TABLE public.arc_definitions
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'life_stream',
  ADD COLUMN IF NOT EXISTS chapter text NOT NULL DEFAULT 'one';

-- Rename the table
ALTER TABLE public.arc_definitions RENAME TO tracks;

-- Strip "arc_" prefix from track keys
UPDATE public.tracks SET key = REPLACE(key, 'arc_', '') WHERE key LIKE 'arc_%';

-- Remove the duplicate "people" track (merge into "belonging")
-- First, update any storylets that reference arc_people to point to arc_belonging
DO $$
DECLARE
  people_id uuid;
  belonging_id uuid;
BEGIN
  SELECT id INTO people_id FROM public.tracks WHERE key = 'people';
  SELECT id INTO belonging_id FROM public.tracks WHERE key = 'belonging';

  IF people_id IS NOT NULL AND belonging_id IS NOT NULL THEN
    -- Move any storylets from people to belonging
    UPDATE public.storylets SET arc_id = belonging_id WHERE arc_id = people_id;
    -- Move any arc_instances from people to belonging
    UPDATE public.arc_instances SET arc_id = belonging_id WHERE arc_id = people_id;
    -- Move any choice_log references
    UPDATE public.choice_log SET arc_id = belonging_id WHERE arc_id = people_id;
    -- Delete the duplicate
    DELETE FROM public.tracks WHERE id = people_id;
  END IF;
END $$;

-- ============================================================================
-- 2. Create `track_progress` table from arc_instances
-- ============================================================================

-- Add track_state column before rename
ALTER TABLE public.arc_instances
  ADD COLUMN IF NOT EXISTS track_state text;

-- Rename columns to match new terminology
ALTER TABLE public.arc_instances RENAME COLUMN arc_id TO track_id;
ALTER TABLE public.arc_instances RENAME COLUMN current_step_key TO current_storylet_key;
ALTER TABLE public.arc_instances RENAME COLUMN step_due_day TO storylet_due_day;
ALTER TABLE public.arc_instances RENAME COLUMN step_defer_count TO defer_count;

-- Rename the table
ALTER TABLE public.arc_instances RENAME TO track_progress;

-- Migrate stream_states from daily_states into track_progress.track_state
-- For each active track_progress row, look up the corresponding stream state
-- from the most recent daily_states row for that user.
DO $$
DECLARE
  tp RECORD;
  track_key text;
  stream_val text;
BEGIN
  FOR tp IN SELECT tp.id, tp.user_id, tp.track_id, t.key as tkey
            FROM public.track_progress tp
            JOIN public.tracks t ON t.id = tp.track_id
            WHERE tp.track_state IS NULL
  LOOP
    track_key := tp.tkey;

    -- Get the stream state from the latest daily_states row
    SELECT ds.stream_states->>track_key INTO stream_val
    FROM public.daily_states ds
    WHERE ds.user_id = tp.user_id
    ORDER BY ds.day_index DESC
    LIMIT 1;

    IF stream_val IS NOT NULL THEN
      UPDATE public.track_progress SET track_state = stream_val WHERE id = tp.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. Add new columns to storylets (alongside old ones for transition)
-- ============================================================================

-- track_id mirrors arc_id (same FK, new name for new code paths)
ALTER TABLE public.storylets
  ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storylet_key text,
  ADD COLUMN IF NOT EXISTS default_next_key text;

-- Copy existing data from old columns to new columns
UPDATE public.storylets
SET
  track_id = arc_id,
  storylet_key = step_key,
  default_next_key = default_next_step_key
WHERE arc_id IS NOT NULL;

-- Create indexes for new columns
CREATE UNIQUE INDEX IF NOT EXISTS storylets_track_id_storylet_key_unique
  ON public.storylets (track_id, storylet_key)
  WHERE track_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS storylets_track_id_order_index
  ON public.storylets (track_id, order_index)
  WHERE track_id IS NOT NULL;

-- ============================================================================
-- 4. Update choice_log foreign keys
-- ============================================================================

-- choice_log references arc_definitions (now tracks) and arc_instances (now track_progress)
-- The FK constraints auto-follow the table rename, but let's rename the columns for clarity
ALTER TABLE public.choice_log RENAME COLUMN arc_id TO track_id;
ALTER TABLE public.choice_log RENAME COLUMN arc_instance_id TO track_progress_id;

-- ============================================================================
-- 5. Update RLS policies for renamed tables
-- ============================================================================

-- tracks (was arc_definitions) — public read
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Drop old policies that reference old table name (they auto-renamed but names are stale)
  BEGIN DROP POLICY IF EXISTS "arc_definitions_select_authenticated" ON public.tracks; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "arc_definitions_public_read" ON public.tracks; EXCEPTION WHEN undefined_object THEN NULL; END;

  BEGIN
    CREATE POLICY "tracks_select_public" ON public.tracks
      FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- track_progress (was arc_instances) — user owns their rows
ALTER TABLE public.track_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "arc_instances_select_own" ON public.track_progress; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "arc_instances_insert_own" ON public.track_progress; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "arc_instances_update_own" ON public.track_progress; EXCEPTION WHEN undefined_object THEN NULL; END;

  BEGIN
    CREATE POLICY "track_progress_select_own" ON public.track_progress
      FOR SELECT USING (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "track_progress_insert_own" ON public.track_progress
      FOR INSERT WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "track_progress_update_own" ON public.track_progress
      FOR UPDATE USING (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================================
-- 6. Update storylet choices: migrate sets_stream_state → sets_track_state
-- ============================================================================

-- In storylet choices JSON, convert:
--   { "sets_stream_state": { "stream": "roommate", "state": "X" } }
-- to also include:
--   { "sets_track_state": { "state": "X" } }
-- This allows new code to read sets_track_state while old code still reads sets_stream_state.

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice ? 'sets_stream_state' AND choice->'sets_stream_state'->>'state' IS NOT NULL
      THEN choice || jsonb_build_object('sets_track_state', jsonb_build_object('state', choice->'sets_stream_state'->>'state'))
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE choices::text LIKE '%sets_stream_state%';

-- Also migrate next_step_key → next_key in choices
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice ? 'next_step_key' AND choice->>'next_step_key' IS NOT NULL
      THEN choice || jsonb_build_object('next_key', choice->>'next_step_key')
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE choices::text LIKE '%next_step_key%';

-- ============================================================================
-- 7. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.tracks IS 'Narrative tracks (renamed from arc_definitions). See docs/TRACK_AND_STORYLET_MODEL.md.';
COMMENT ON TABLE public.track_progress IS 'Player progress per track (renamed from arc_instances). track_state holds narrative FSM state.';
COMMENT ON COLUMN public.storylets.track_id IS 'Track this storylet belongs to (null = standalone). Mirrors arc_id during transition.';
COMMENT ON COLUMN public.storylets.storylet_key IS 'Unique key within track. Mirrors step_key during transition.';
COMMENT ON COLUMN public.storylets.default_next_key IS 'Default next storylet_key. Mirrors default_next_step_key during transition.';
