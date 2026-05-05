-- priya_dining_hall — Beat 2E RETROFIT: "Priya's Introduction"
--                   + Day-window move (11 → 4) per session decision 2026-05-04.
--
-- Existing storylet (belonging track). Originally Day 11 afternoon
-- (due_offset_days=11) — incoherent with the brief's collision design,
-- which positions Beat 2E as a Day 4-6 belonging beat colliding with
-- walk_to_class_day4 (Day 4 morning) and the tail of study_group_forming
-- (Day 3 afternoon). Per session decision: move to due_offset_days=4,
-- expires_after_days=2 (Day 4-6 window).
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Beat 2E"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 4–6, Afternoon — Beat 2E"
--
-- ─────────────────────────────────────────────────────────────────────
-- What changes
-- ─────────────────────────────────────────────────────────────────────
--
-- 1. Day window: due_offset_days 11 → 4, expires_after_days 2 → 2
--    (now Day 4-6 instead of Day 11-13).
--
-- 2. Body text: original said "her mother keeps asking her if she has met
--    anyone nice at college and she has been here eleven days." That phrase
--    is incoherent on Day 4. Updated to "she has only been here a few days."
--
-- 3. Five new nodes prepended to the existing node list. Bryce drops into
--    the seat across from Priya and asks "where are you from" — then "where
--    are your PARENTS from." The friction beat. Priya's response is patient.
--    Player picks absorbed | deflected | challenged. priya_aftermath flows
--    into the existing study_invite node so the existing scene continues.
--
--    where_youre_from   speaker bryce → priya_says_jersey
--    priya_says_jersey  speaker priya → bryce_pushes
--    bryce_pushes       speaker bryce → priya_responds
--    priya_responds     speaker priya, THE FRICTION (3 micros) → priya_aftermath
--      absorbed   → priya_absorbed  + period_stance absorbed
--      deflected  → priya_deflected + period_stance deflected
--                 + set_npc_memory priya.dining_deflected
--      challenged → priya_challenged + period_stance challenged
--                 + set_npc_memory priya.dining_challenged
--    priya_aftermath    text_variants on flag → study_invite (existing)
--
-- 4. Existing terminal `priya_continue` events_emitted upgraded from flat
--    [SHARED_MEAL] to ConditionalEmissionGroup[]. SHARED_MEAL preserved as
--    the always-on baseline (included in every group since first-match-wins).
--    Friction-conditional fallout layered on top:
--      • flag priya_absorbed   → SHARED_MEAL priya 1.0
--                                (silent pattern; no positive deposit)
--      • flag priya_deflected  → SHARED_MEAL priya 1.0,
--                                SMALL_KINDNESS priya 0.5,
--                                DEFERRED_TENSION bryce 0.3
--      • flag priya_challenged → SHARED_MEAL priya 1.0,
--                                SMALL_KINDNESS priya 1.0,
--                                DEFERRED_TENSION bryce 0.5
--      • else → SHARED_MEAL priya 1.0  (defensive fallback)
--
-- 5. introduces_npc adds Bryce + Priya. Bryce had no prior introduces_npc
--    (evening_choice does not introduce him via the registry mechanism;
--    his "introduction" was diegetic only). Priya likewise. Idempotent
--    with study_group_forming retrofit (Day 3) — first-encounter path is
--    whichever fires first per player; subsequent fires are no-op.

UPDATE public.storylets
SET
  due_offset_days = 4,
  expires_after_days = 2,
  introduces_npc = ARRAY['npc_anderson_bryce', 'npc_studious_priya']::text[],

  body = $body$Priya comes through the line with a tray and a book under her arm. She sees you and comes over. "Can I sit?" She sits before you answer, which is Priya.

She is reading The Second Sex. Library copy — you can see the Dewey decimal sticker on the spine. She is not reading it for class.

She tells you, unprompted, that her sister got engaged over the summer to a guy Priya does not like, and that her mother keeps asking her if she has met anyone nice at college and she has only been here a few days. She says all of this while eating a dining hall grilled cheese and the monologue takes about two minutes and requires nothing from you except to be a person sitting across from her.

Then she puts the sandwich down and wipes her fingers on a paper napkin.$body$,

  nodes = $nodes$[
    {
      "id": "where_youre_from",
      "speaker": "npc_anderson_bryce",
      "text": "Bryce drops into the seat across from Priya, tray clattering. \"I haven't met you yet. I'm Bryce. So where are you from?\"",
      "next": "priya_says_jersey"
    },
    {
      "id": "priya_says_jersey",
      "speaker": "npc_studious_priya",
      "text": "\"New Jersey.\" She pours dressing on her salad. Doesn't look up.",
      "next": "bryce_pushes"
    },
    {
      "id": "bryce_pushes",
      "speaker": "npc_anderson_bryce",
      "text": "\"No but like — where are your parents from?\" Bryce gestures vaguely at her face. Smiling. Genuinely curious.",
      "next": "priya_responds"
    },
    {
      "id": "priya_responds",
      "speaker": "npc_studious_priya",
      "text": "\"New Jersey.\" Her tone is patient in a way that makes you realize she's done this before. Many times. Bryce starts to laugh, like she's making a joke.",
      "micro_choices": [
        {
          "id": "priya_absorbed",
          "label": "Stay out of it. She's handling it.",
          "next": "priya_aftermath",
          "sets_flag": "priya_absorbed",
          "period_stance": "absorbed"
        },
        {
          "id": "priya_deflected",
          "label": "\"Hey Bryce, did you find your bio textbook yet?\"",
          "next": "priya_aftermath",
          "sets_flag": "priya_deflected",
          "period_stance": "deflected",
          "set_npc_memory": {
            "npc_studious_priya": { "dining_deflected": true }
          }
        },
        {
          "id": "priya_challenged",
          "label": "\"She said New Jersey.\"",
          "next": "priya_aftermath",
          "sets_flag": "priya_challenged",
          "period_stance": "challenged",
          "set_npc_memory": {
            "npc_studious_priya": { "dining_challenged": true }
          }
        }
      ]
    },
    {
      "id": "priya_aftermath",
      "text": "Bryce doesn't quite get it. He says something about how he just meant it as a friendly question. The conversation drifts. Priya eats her salad.",
      "text_variants": [
        {
          "condition": { "flag": "priya_deflected" },
          "text": "Bryce takes the textbook bait. He hasn't found it. Five-minute story about the bookstore line. Priya catches your eye for a second. Goes back to her salad."
        },
        {
          "condition": { "flag": "priya_challenged" },
          "text": "Bryce flushes. \"I — yeah, of course. Sorry.\" He recovers quick, makes a joke about the cafeteria food. Priya looks at you with something complicated. Says nothing."
        }
      ],
      "next": "study_invite"
    },
    {
      "id": "study_invite",
      "text": "She is looking at you the way Priya looks at people — direct, a little impatient, already three steps ahead in a conversation you have not started yet.",
      "micro_choices": [
        {
          "id": "say_yes_study",
          "label": "Sure, I will be there",
          "next": "priya_nods",
          "sets_flag": "study_group_invited"
        },
        {
          "id": "say_maybe_study",
          "label": "Maybe",
          "next": "priya_maybe",
          "sets_flag": "study_group_invited"
        },
        {
          "id": "say_no_study",
          "label": "I can not, Tuesdays are bad",
          "next": "priya_shrug"
        },
        {
          "id": "ask_about_keith",
          "label": "Keith Hollis?",
          "next": "priya_keith",
          "sets_flag": "study_group_invited"
        }
      ]
    },
    {
      "id": "priya_nods",
      "text": "\"Good.\" She picks up the grilled cheese again. The matter is settled. She moves on to telling you about the reading for Thursday and how Heller assigns twice as much as anyone can actually do, which Priya clearly takes as a personal challenge.",
      "speaker": "npc_studious_priya",
      "next": "choices"
    },
    {
      "id": "priya_maybe",
      "text": "\"Maybe means yes but you want to feel like you are choosing. Tuesday. Eight. Keith's room.\" She picks up the grilled cheese again. The matter, in Priya's mind, is settled.",
      "speaker": "npc_studious_priya",
      "next": "choices"
    },
    {
      "id": "priya_shrug",
      "text": "She shrugs. \"Your loss. The reading for next week is forty pages and Heller cold-calls.\" She picks up the grilled cheese. The conversation moves to something else. But you notice she does not invite you again.",
      "speaker": "npc_studious_priya",
      "next": "choices"
    },
    {
      "id": "priya_keith",
      "text": "\"You know another Keith?\" She does not wait for an answer. \"He is bringing the notes from last week. I am bringing the highlighters. There is a system.\"",
      "speaker": "npc_studious_priya",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  choices = $choices$[
    {
      "id": "priya_continue",
      "label": "Continue",
      "outcome": {
        "text": "She finishes the grilled cheese, tucks The Second Sex back under her arm, picks up her tray. \"Tuesday. Eight. Keith's room.\" She is gone before you have decided whether you said yes or maybe.",
        "deltas": {}
      },
      "precludes": [],
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "events_emitted": [
        {
          "condition": { "flag": "priya_absorbed" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SHARED_MEAL", "magnitude": 1 }
          ]
        },
        {
          "condition": { "flag": "priya_deflected" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SHARED_MEAL",       "magnitude": 1 },
            { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS",    "magnitude": 0.5 },
            { "npc_id": "npc_anderson_bryce", "type": "DEFERRED_TENSION",  "magnitude": 0.3 }
          ]
        },
        {
          "condition": { "flag": "priya_challenged" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SHARED_MEAL",       "magnitude": 1 },
            { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS",    "magnitude": 1.0 },
            { "npc_id": "npc_anderson_bryce", "type": "DEFERRED_TENSION",  "magnitude": 0.5 }
          ]
        },
        {
          "condition": { "else": true },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SHARED_MEAL", "magnitude": 1 }
          ]
        }
      ]
    }
  ]$choices$::jsonb
WHERE slug = 'priya_dining_hall';
