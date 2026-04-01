-- Playthrough log table.
-- Stores one row per user: a JSONB array of resolved-storylet entries.
-- Appended on every storylet resolve. Reset (entries = []) when day_index = 0.
-- Used by GET /api/dev/playthrough-log to render a readable session log.

CREATE TABLE IF NOT EXISTS public.playthrough_log (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entries    jsonb        NOT NULL DEFAULT '[]',
  started_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.playthrough_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own playthrough log"
  ON public.playthrough_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
