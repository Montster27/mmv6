-- ============================================================================
-- 2026-04-22 — tuesday_commitment flag persistence + NPC introductions
-- ============================================================================
--
-- Companion to the dailyLoop.ts change that unions a global flag set before
-- evaluating requires_flag. See HANDOFF 2026-04-20 "Known limitation" and
-- 2026-04-22 session.
--
-- WHY:
--   `tuesday_commitment` sets walk flags (tuesday_study_group, tuesday_terminal,
--   tuesday_shift, tuesday_dana_movie) inside its micro-choices, and then ends
--   in a single terminal choice (`tuesday_decided`) that writes nothing to
--   choice_log. Walk flags are scene-local — they vanish when the storylet
--   resolves, so `tuesday_night_terminal` and `the_post` (both gated by
--   `requires_flag: tuesday_terminal`) never fire in a real run.
--
-- WHAT:
--   Replace the single `tuesday_decided` terminal with four walk-flag-gated
--   terminals, one per commitment. Each uses `requires_flag` against the
--   walk flag the micro-choice sets, and each writes the same flag persistently
--   via `sets_flag` so downstream storylets can read it through choice_log.
--
--   DialogueNodeView filters choices by `requires_flag` against the walk-flag
--   set (DialogueNodeView.tsx:179) so the player only sees the terminal that
--   matches the commitment they made.
--
-- COUPLING:
--   Requires the engine change to dailyLoop.ts + selectTrackStorylets.ts that
--   unions globalFlags onto each track's flagsByTrack before meetsRequirements.
--   Without that, the persisted `tuesday_terminal` flag would still fail to
--   gate `the_post` (opportunity track) because the flag is written on the
--   belonging track.
--
-- SECONDARY FIXES (Known Issue #5):
--   - evening_choice: introduces Bryce (named in body, Anderson Hall host).
--   - morning_after_cards: introduces Peterson (named in body, card-game host).
-- ============================================================================

-- 1. tuesday_commitment — four walk-flag-gated terminals with persistent sets_flag.
UPDATE storylets
SET choices = $json$[
  {
    "id": "tuesday_decided_study",
    "label": "Fold the schedule. Keith's room, Tuesday.",
    "outcome": {
      "text": "You fold the schedule along its creases. The paper is getting thin where it folds. You put it in your back pocket and go brush your teeth. Tuesday is Keith's room.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "tuesday_study_group",
    "sets_flag": ["tuesday_study_group"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["achieve"]
  },
  {
    "id": "tuesday_decided_terminal",
    "label": "Fold the schedule. Whitmore basement, Tuesday.",
    "outcome": {
      "text": "You fold the schedule along its creases. The paper is getting thin where it folds. You put it in your back pocket and go brush your teeth. Tuesday is the basement.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "tuesday_terminal",
    "sets_flag": ["tuesday_terminal"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["risk", "achieve"]
  },
  {
    "id": "tuesday_decided_shift",
    "label": "Fold the schedule. The shift is the shift.",
    "outcome": {
      "text": "You fold the schedule along its creases. The paper is getting thin where it folds. You put it in your back pocket and go brush your teeth. Tuesday is the shift.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "tuesday_shift",
    "sets_flag": ["tuesday_shift"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety"]
  },
  {
    "id": "tuesday_decided_movie",
    "label": "Fold the schedule. The movie with Scott, Tuesday.",
    "outcome": {
      "text": "You fold the schedule along its creases. The paper is getting thin where it folds. You put it in your back pocket and go brush your teeth. Tuesday is the movie.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "tuesday_dana_movie",
    "sets_flag": ["tuesday_dana_movie"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["people"]
  }
]$json$::jsonb
WHERE storylet_key = 'tuesday_commitment';

-- 2. evening_choice introduces Bryce (Anderson Hall host, named in body).
UPDATE storylets
SET introduces_npc = ARRAY['npc_anderson_bryce']
WHERE storylet_key = 'evening_choice';

-- 3. morning_after_cards introduces Peterson (card game host, named in body).
UPDATE storylets
SET introduces_npc = ARRAY['npc_floor_peterson']
WHERE storylet_key = 'morning_after_cards';
