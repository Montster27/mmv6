-- Player identity selection infrastructure (step 1 of period-stance spec).
--
-- Adds three demographic-identity columns to `characters`. Values are set at
-- character creation (new game) and are not editable after.  They are queried
-- by content (period-friction beats) to vary prose, micro-choice sets, and
-- NPC relational fallout by the player's perspective on 1983 norms.
--
-- Spec: docs/specs/CODE-SPEC-period-stance-infrastructure.md §2
-- Decisions: docs/specs/CODE-SPEC-period-stance-infrastructure-DECISIONS.md §Q1
--
-- `unspecified` is a valid, default choice.  A player who leaves everything
-- unspecified sees beats written from the 1983-dorm default perspective
-- (typically white / male / straight).  No beat is hidden on that basis.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS identity_race text NOT NULL DEFAULT 'unspecified'
    CHECK (identity_race IN (
      'white','black','asian','latino','south_asian','mena',
      'multiracial','other','unspecified'
    )),
  ADD COLUMN IF NOT EXISTS identity_gender text NOT NULL DEFAULT 'unspecified'
    CHECK (identity_gender IN (
      'man','woman','nonbinary','unspecified'
    )),
  ADD COLUMN IF NOT EXISTS identity_sexuality text NOT NULL DEFAULT 'unspecified'
    CHECK (identity_sexuality IN (
      'straight','gay','bi','questioning','unspecified'
    ));

COMMENT ON COLUMN public.characters.identity_race IS
  'Player-selected racial identity for 1983 friction-beat perspective. Set at character creation; read-only after.';
COMMENT ON COLUMN public.characters.identity_gender IS
  'Player-selected gender identity for 1983 friction-beat perspective. Set at character creation; read-only after.';
COMMENT ON COLUMN public.characters.identity_sexuality IS
  'Player-selected sexuality for 1983 friction-beat perspective. Set at character creation; read-only after.';
