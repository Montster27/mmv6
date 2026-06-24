-- ============================================================
-- Clubs — MVP (creation, membership, applications, SCA seed)
-- ============================================================
-- Ticket: MP-01
-- Spec:   docs/prompts/MP-01-clubs.md
--
-- Three tables for the minimum-viable clubs system. Player refs
-- point at auth.users(id) (MMV has no separate `players` table —
-- a "player" is an authenticated user, same convention as
-- 20260527154342_newsnet_async_board.sql).
--
-- Membership is one-club-per-player, enforced at the DB level by a
-- UNIQUE constraint on club_members.player_id. Applications allow at
-- most one *pending* row per (club, applicant) via a partial unique
-- index; resolved (accepted/rejected) rows don't block re-applying.
--
-- founder_player_id is nullable with ON DELETE SET NULL: the SCA
-- starts founder-less, and a founder who wipes their account (auth
-- user delete) leaves the club standing rather than cascading it
-- away. An admin can reassign the founder afterward.
--
-- Writes are server-mediated (Route Handlers using the service-role
-- client, which bypasses RLS), so — following the newsnet precedent —
-- only SELECT policies are defined. clubs / club_members are readable
-- by any authenticated user (the directory is public to players);
-- club_applications is restricted to the applicant and the club's
-- founder.
-- ============================================================

BEGIN;

-- ─── clubs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clubs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL UNIQUE
                            CHECK (char_length(name) BETWEEN 2 AND 60),
  description             TEXT NOT NULL DEFAULT ''
                            CHECK (char_length(description) <= 500),
  founder_player_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_open_to_applications BOOLEAN NOT NULL DEFAULT true,
  is_system_seeded        BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY clubs_select ON public.clubs
  FOR SELECT TO authenticated
  USING (true);

-- No client write policies — clubs are created/updated server-side.

COMMENT ON TABLE public.clubs IS
  'Player-foundable clubs. The SCA (is_system_seeded=true) is seeded at migration time and is every new character''s default club.';
COMMENT ON COLUMN public.clubs.founder_player_id IS
  'auth.users(id) of the founder. NULL for the seeded SCA until an admin assigns one, or after a founder''s account is deleted (ON DELETE SET NULL).';

-- ─── club_members ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.club_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_members_club_idx
  ON public.club_members (club_id);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY club_members_select ON public.club_members
  FOR SELECT TO authenticated
  USING (true);

-- No client write policies — membership changes are server-side.

COMMENT ON TABLE public.club_members IS
  'One row per player. The UNIQUE on player_id enforces one-club-per-player at the DB level; moving clubs is delete-then-insert, done server-side.';

-- ─── club_applications ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.club_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  applicant_player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

-- At most one pending application per (club, applicant). Resolved rows
-- (accepted/rejected) are excluded, so a rejected applicant can re-apply.
CREATE UNIQUE INDEX IF NOT EXISTS club_applications_one_pending_idx
  ON public.club_applications (club_id, applicant_player_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS club_applications_club_idx
  ON public.club_applications (club_id);

CREATE INDEX IF NOT EXISTS club_applications_applicant_idx
  ON public.club_applications (applicant_player_id);

ALTER TABLE public.club_applications ENABLE ROW LEVEL SECURITY;

-- Applicants see their own applications; founders see applications to
-- their club. (Server reads use the service-role client and bypass this
-- regardless; the policy is defense-in-depth for any direct client read.)
CREATE POLICY club_applications_select ON public.club_applications
  FOR SELECT TO authenticated
  USING (
    applicant_player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = club_applications.club_id
        AND c.founder_player_id = auth.uid()
    )
  );

-- No client write policies — applications are filed/resolved server-side.

COMMENT ON TABLE public.club_applications IS
  'Membership applications. Partial unique index allows one pending row per (club, applicant); resolved rows let a rejected player re-apply.';

-- ─── Seed: Society for Creative Anachronism ──────────────────────────
-- The default club every new character joins. founder_player_id stays
-- NULL until an admin assigns one via /api/admin/clubs/set-founder.
INSERT INTO public.clubs (name, description, is_system_seeded, founder_player_id)
VALUES (
  'Society for Creative Anachronism',
  'The campus home everyone starts in. Medieval recreation, period feasts, and rattan combat in the quad — a place to belong while you find your people.',
  true,
  NULL
)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP TABLE IF EXISTS public.club_applications;
-- DROP TABLE IF EXISTS public.club_members;
-- DROP TABLE IF EXISTS public.clubs;
