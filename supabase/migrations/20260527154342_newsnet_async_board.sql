-- ============================================================
-- NewsNet — Usenet async multi-user board
-- ============================================================
-- Ticket: T-1776329282002
-- Spec:   docs/specs/CODE-SPEC-newsnet-multiuser.md
--
-- Creates the two NewsNet tables (player-authored posts + per-player
-- chosen handles). Both follow the player_arc_flags pattern from
-- 20260419100000_phase3_harvest_pool.sql: authenticated-read,
-- own-rows-only write, no UPDATE/DELETE policies (immutable for
-- this build).
--
-- The board CHECK constraint locks the three valid board names.
-- The case-insensitive UNIQUE index on player_handles enforces
-- handle uniqueness regardless of casing (so `Cassandra_7` and
-- `cassandra_7` collide at the DB level, not just at the API).
-- ============================================================

BEGIN;

-- newsnet_posts — one row per player-authored post
CREATE TABLE IF NOT EXISTS public.newsnet_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle       TEXT NOT NULL,
  board        TEXT NOT NULL CHECK (board IN ('net.philosophy', 'net.misc', 'rec.music')),
  body         TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  in_game_day  INTEGER NOT NULL CHECK (in_game_day >= 0),
  posted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsnet_posts_board_day_idx
  ON public.newsnet_posts (board, in_game_day DESC, posted_at DESC);

CREATE INDEX IF NOT EXISTS newsnet_posts_player_idx
  ON public.newsnet_posts (player_id);

ALTER TABLE public.newsnet_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsnet_posts_select ON public.newsnet_posts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY newsnet_posts_insert_own ON public.newsnet_posts
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

-- No UPDATE or DELETE policies — posts are immutable for this build.

COMMENT ON TABLE public.newsnet_posts IS
  'Player-authored Usenet-style posts. Merged at read time with harvest_items where type=''usenet'' to form the NewsNet feed. Immutable for Gate 2 (no edit/delete).';
COMMENT ON COLUMN public.newsnet_posts.handle IS
  'Denormalized from player_handles at write time so feed rendering needs no join.';
COMMENT ON COLUMN public.newsnet_posts.in_game_day IS
  'Server-stamped from player_day_state.day_index at write time. Client-supplied values are ignored.';

-- player_handles — one row per player, set-once
CREATE TABLE IF NOT EXISTS public.player_handles (
  player_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle      TEXT NOT NULL UNIQUE CHECK (char_length(handle) BETWEEN 2 AND 20),
  chosen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness — `Cassandra_7` and `cassandra_7` collide
CREATE UNIQUE INDEX IF NOT EXISTS player_handles_handle_lower_idx
  ON public.player_handles (LOWER(handle));

ALTER TABLE public.player_handles ENABLE ROW LEVEL SECURITY;

CREATE POLICY player_handles_select ON public.player_handles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY player_handles_insert_own ON public.player_handles
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

-- No UPDATE or DELETE policies — handles are set-once for this build.

COMMENT ON TABLE public.player_handles IS
  'Per-player chosen Usenet handle. Set once at first NewsNet visit. Handle character set and reservation list enforced at the API layer.';

COMMIT;

-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP TABLE IF EXISTS public.newsnet_posts;
-- DROP TABLE IF EXISTS public.player_handles;
