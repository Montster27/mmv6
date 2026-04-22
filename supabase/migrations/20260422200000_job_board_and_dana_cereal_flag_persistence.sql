-- ============================================================================
-- 2026-04-22 — job_board + dana_cereal flag persistence
-- ============================================================================
--
-- Closes Known Issue #13. Same pattern as the 2026-04-22 tuesday_commitment
-- migration: walk-flag-gated terminal choices that each persist their flag
-- via `sets_flag`, so downstream `requires_flag` gates fire in a real run.
--
-- job_board:
--   Four micro-choices (job_library/job_dining/job_grounds/job_research) each
--   set a scene-local walk flag (has_job_library / has_job_dining /
--   has_job_grounds / has_job_research) on `pick_card`. The single terminal
--   `leave_board` did not persist anything, so the four `first_shift_*`
--   storylets on Day 10 (each gated by `requires_flag: has_job_*`) never fire.
--   Replace with four flag-gated terminals, each carrying the `has_job_*`
--   walk flag as `requires_flag` plus persistent `sets_flag`.
--
-- dana_cereal:
--   Three conversational paths — cold (bed_not_talking sets dana_cereal_cold),
--   engaged (take_handful / ask_game set dana_cereal_engaged), and neutral
--   (no_thanks currently sets nothing). Single terminal `cereal_continue` did
--   not persist anything, so `dana_letter_avoidance` (Day 9 evening, gated by
--   `requires_flag: dana_cereal_cold`) never fires.
--   Add walk flag `dana_cereal_neutral` to the no_thanks micro-choice so every
--   path writes exactly one walk flag, then replace the single terminal with
--   three flag-gated terminals (cold / engaged / neutral), each persisting
--   its flag via sets_flag.
--
-- Depends on the 2026-04-22 engine change (globalFlags union in dailyLoop.ts
-- + selectTrackStorylets.ts) for cross-track resolution. Within-track is
--   trivial here (all gates are same-track: money → money, roommate → roommate)
-- but the globalFlags path also covers it.
-- ============================================================================

-- 1. job_board — four terminals, one per has_job_* flag.
UPDATE storylets
SET choices = $json$[
  {
    "id": "leave_board_library",
    "label": "Head out — Baker Library shelving.",
    "outcome": {
      "text": "You fold the card and put it in your back pocket. The cork underneath is lighter where the card was — a little rectangle of the original color, like the shadow of something that has been there a long time.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "has_job_library",
    "sets_flag": ["has_job_library"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety", "achieve"],
    "sets_track_state": {"state": "friction_visible"}
  },
  {
    "id": "leave_board_dining",
    "label": "Head out — dining commons, early shift.",
    "outcome": {
      "text": "You fold the card and put it in your back pocket. The cork underneath is lighter where the card was — a little rectangle of the original color, like the shadow of something that has been there a long time.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "has_job_dining",
    "sets_flag": ["has_job_dining"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety", "people"],
    "sets_track_state": {"state": "friction_visible"}
  },
  {
    "id": "leave_board_grounds",
    "label": "Head out — grounds crew.",
    "outcome": {
      "text": "You fold the card and put it in your back pocket. The cork underneath is lighter where the card was — a little rectangle of the original color, like the shadow of something that has been there a long time.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "has_job_grounds",
    "sets_flag": ["has_job_grounds"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety", "risk"],
    "sets_track_state": {"state": "friction_visible"}
  },
  {
    "id": "leave_board_research",
    "label": "Head out — Economics, R. Chen in Crandall 304.",
    "outcome": {
      "text": "You fold the card and put it in your back pocket. The cork underneath is lighter where the card was — a little rectangle of the original color, like the shadow of something that has been there a long time.",
      "deltas": {}
    },
    "precludes": [],
    "requires_flag": "has_job_research",
    "sets_flag": ["has_job_research"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["achieve"],
    "sets_track_state": {"state": "friction_visible"}
  }
]$json$::jsonb
WHERE storylet_key = 'job_board';

-- 2. dana_cereal — add walk flag to the no_thanks micro-choice so every path
--    writes exactly one walk flag, then three flag-gated terminals.
UPDATE storylets
SET nodes = $json$[
  {
    "id": "cereal_offer",
    "text": "The box rustles when he tilts it. The room smells faintly of cardboard and the particular staleness of cereal that has been open too long.",
    "micro_choices": [
      {
        "id": "take_handful",
        "next": "stale",
        "label": "Take a handful",
        "sets_flag": "dana_cereal_engaged"
      },
      {
        "id": "ask_game",
        "next": "game_talk",
        "label": "How'd they do?",
        "sets_flag": "dana_cereal_engaged"
      },
      {
        "id": "no_thanks",
        "next": "quiet_room",
        "label": "No thanks",
        "sets_flag": "dana_cereal_neutral"
      },
      {
        "id": "bed_not_talking",
        "next": "radio_down",
        "label": "Start getting ready for bed",
        "sets_flag": "dana_cereal_cold"
      }
    ]
  },
  {
    "id": "stale",
    "next": "choices",
    "text": "\"They're stale, sorry,\" Scott says, and goes back to listening to the radio. You eat them anyway. They are stale. The sound the box makes when you reach in again is the loudest thing in the room for a while."
  },
  {
    "id": "game_talk",
    "next": "choices",
    "text": "\"Blew it in the eighth. Morris gave up a three-run double.\" He shakes his head. \"They're not going anywhere this year anyway.\" He says it the way people say things about teams they have watched lose for a long time — without heat, just the flat certainty of someone who has already done his grieving."
  },
  {
    "id": "quiet_room",
    "next": "choices",
    "text": "Scott shifts the box to his lap and keeps eating. The room is quiet except for the radio. Anderson is saying something about the bullpen. The cereal crackles faintly every time Scott reaches into the box."
  },
  {
    "id": "radio_down",
    "next": "choices",
    "text": "Scott turns the radio down another notch without being asked. The game becomes a murmur — you can hear the cadence of the announcer but not the words. The faucet in the bathroom down the hall is running. Someone else is still up."
  }
]$json$::jsonb,
    choices = $json$[
  {
    "id": "cereal_continue_cold",
    "label": "Continue",
    "outcome": {"text": "", "deltas": {}},
    "precludes": [],
    "requires_flag": "dana_cereal_cold",
    "sets_flag": ["dana_cereal_cold"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": []
  },
  {
    "id": "cereal_continue_engaged",
    "label": "Continue",
    "outcome": {"text": "", "deltas": {}},
    "precludes": [],
    "requires_flag": "dana_cereal_engaged",
    "sets_flag": ["dana_cereal_engaged"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": []
  },
  {
    "id": "cereal_continue_neutral",
    "label": "Continue",
    "outcome": {"text": "", "deltas": {}},
    "precludes": [],
    "requires_flag": "dana_cereal_neutral",
    "sets_flag": ["dana_cereal_neutral"],
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": []
  }
]$json$::jsonb
WHERE storylet_key = 'dana_cereal';
