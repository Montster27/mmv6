-- Migration 0134: Resource tension breadth
--
-- Adds resource grants, costs, and gates across the full week-1 and week-2
-- storylet arc so that time-allocation choices (Work→cash, Study→knowledge,
-- Social→socialLeverage, Health→physicalResilience) feel consequential.
--
-- IMPORTANT: Apply migration 0133 first.  0133 handles:
--   s3_dining_hall   approach_miguel  (costs 5 cash, grants +2 social)
--   s13_miguel_party_invite  go_to_party  (requires 15 cash, costs 15)
--   s14_marsh_office_hours   ask_about_paper  (requires 20 knowledge)
--   NEW s_gym_early_access   (requires 30 physicalResilience)
--
-- This migration covers s7–s27 and creates three investment chains:
--
--   Work → cash      → Dining Hall (0133) → Party (0133) → Road Trip (this)
--   Study → knowledge → Office Hours (0133) → Paper / Priya (this)
--   Social → socialLeverage → shows social network growing (this)
--   Health → physicalResilience → Gym (0133, this)
--
-- Pattern used for safe jsonb merging (preserves existing outcome.text):
--
--   choice || jsonb_build_object(
--     'outcome',
--     COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
--       'deltas',
--       COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
--         'resources',
--         COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"key": N}'::jsonb
--       )
--     )
--   )
--
-- Touch updated_at on every modified row to bust the localStorage catalog cache.
-- ============================================================


-- ============================================================
-- s7_first_class — academic engagement rewards attention
-- raise_hand_answer  → +3 knowledge (confident, prepared)
-- speak_wrong        → +1 knowledge (learning by trying)
-- wait_someone_else  → no change   (passive)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'raise_hand_answer' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'speak_wrong' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 1}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's7_first_class';


-- ============================================================
-- s8_floor_meeting — social choices build floor connections
-- engage_sandra  → +3 socialLeverage (RA relationship)
-- talk_with_cal  → +2 socialLeverage (deepens friendship)
-- sit_quiet      → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'engage_sandra' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'talk_with_cal' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 2}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's8_floor_meeting';


-- ============================================================
-- s9_orientation_fair — joining activities seeds social capital
-- sign_up_something   → +4 socialLeverage (committed to a group)
-- follow_miguel       → +3 socialLeverage (met his network)
-- approach_radio_table→ +2 socialLeverage (first step toward radio)
-- skip_fair           → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'sign_up_something' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 4}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'follow_miguel' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'approach_radio_table' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 2}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's9_orientation_fair';


-- ============================================================
-- s10_parent_call_w1 — asking for something injects cash
-- ask_for_something → +20 cashOnHand (parents send money, real injection)
-- tell_truth_hard   → no resource change (emotional, handled by energy)
-- perform_fine      → no resource change
-- keep_it_short     → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'ask_for_something' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"cashOnHand": 20}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's10_parent_call_w1';


-- ============================================================
-- s11_cal_midnight — late-night socialising: social gain, energy cost
-- go_with_cal       → +3 socialLeverage  (bond strengthens)
-- invite_in_instead → +2 socialLeverage  (shorter but real)
-- decline_cal_politely → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'go_with_cal' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'invite_in_instead' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 2}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's11_cal_midnight';


-- ============================================================
-- s12_study_group_invite — study sessions yield knowledge + social
-- ask_to_join              → +5 knowledge, +3 socialLeverage
-- sit_near_quietly         → +3 knowledge
-- study_alone_different_floor → +4 knowledge (focused solo)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'ask_to_join' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb)
                  || '{"knowledge": 5, "socialLeverage": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'sit_near_quietly' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'study_alone_different_floor' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 4}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's12_study_group_invite';


-- ============================================================
-- s15_dana_small_conflict — resolving tension builds trust
-- address_directly    → +3 socialLeverage (conflict resolved)
-- bring_it_up_lightly → +1 socialLeverage (partial resolution)
-- move_coffee_cup_silently → no change (avoidance)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'address_directly' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'bring_it_up_lightly' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 1}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's15_dana_small_conflict';


-- ============================================================
-- s16_jordan_first_talk — depth of connection determines social gain
-- sit_down_and_talk → +5 socialLeverage (real connection made)
-- stop_briefly      → +2 socialLeverage
-- say_hi_keep_walking → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'sit_down_and_talk' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 5}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'stop_briefly' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 2}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's16_jordan_first_talk';


-- ============================================================
-- s17_campus_job_table — taking the job injects cash
-- apply_for_position   → +20 cashOnHand (modeling first paycheck)
-- look_at_postings_leave → no change
-- decide_not_worth_it  → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'apply_for_position' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"cashOnHand": 20}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's17_campus_job_table';


-- ============================================================
-- s18_the_paper — engagement with the work rewards knowledge
-- leave_note_for_marsh → +3 knowledge, +2 socialLeverage (prof relationship)
-- read_last_paragraph  → +2 knowledge
-- slide_it_in          → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'leave_note_for_marsh' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb)
                  || '{"knowledge": 3, "socialLeverage": 2}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'read_last_paragraph' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 2}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's18_the_paper';


-- ============================================================
-- s19_cal_bad_night — showing up for a friend is a social investment
-- let_him_in         → +4 socialLeverage (deep friendship moment)
-- check_in_through_door → +2 socialLeverage
-- close_door         → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'let_him_in' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 4}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'check_in_through_door' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 2}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's19_cal_bad_night';


-- ============================================================
-- s20_radio_station — walking through the door joins a community
-- go_in          → +6 socialLeverage (largest single-choice social gain)
-- walk_past      → no change
-- stand_outside_leave → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'go_in' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 6}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's20_radio_station';


-- ============================================================
-- s21_priya_form — helping someone reinforces your own understanding
-- walk_over_ask         → +3 socialLeverage, +1 knowledge
-- sit_quietly_same_table→ +1 socialLeverage (quiet presence)
-- leave_her_alone       → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'walk_over_ask' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb)
                  || '{"socialLeverage": 3, "knowledge": 1}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'sit_quietly_same_table' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 1}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's21_priya_form';


-- ============================================================
-- s22_dana_invitation — accepting deepens the roommate relationship
-- say_yes          → +3 socialLeverage
-- ask_what_showing → +1 socialLeverage (interested but cautious)
-- decline_tonight  → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'say_yes' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'ask_what_showing' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 1}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's22_dana_invitation';


-- ============================================================
-- s24_miguel_road_trip — the payoff gate for the cash investment chain
--
-- say_yes_to_trip → REQUIRES 15 cash (covers gas, food, entry)
--                   COSTS    15 cash
--                   GRANTS   +5 socialLeverage (memorable experience)
--
-- ask_for_time    → REQUIRES  8 cash (cheaper partial commitment)
--                   COSTS     8 cash
--                   GRANTS   +2 socialLeverage
--
-- say_no_to_trip  → no cost, no social gain
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'say_yes_to_trip' THEN
          choice
            || jsonb_build_object(
                 'requires_resource',
                 jsonb_build_object('key', 'cashOnHand', 'min', 15)
               )
            || jsonb_build_object(
                 'costs_resource',
                 jsonb_build_object('key', 'cashOnHand', 'amount', 15)
               )
            || jsonb_build_object(
                 'outcome',
                 COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
                   'deltas',
                   COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                     'resources',
                     COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 5}'::jsonb
                   )
                 )
               )
        WHEN choice->>'id' = 'ask_for_time' THEN
          choice
            || jsonb_build_object(
                 'requires_resource',
                 jsonb_build_object('key', 'cashOnHand', 'min', 8)
               )
            || jsonb_build_object(
                 'costs_resource',
                 jsonb_build_object('key', 'cashOnHand', 'amount', 8)
               )
            || jsonb_build_object(
                 'outcome',
                 COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
                   'deltas',
                   COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                     'resources',
                     COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 2}'::jsonb
                   )
                 )
               )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's24_miguel_road_trip';


-- ============================================================
-- s25_parent_call_2 — honest reflection on growth yields a small bonus
-- say_getting_used_to_it   → +1 knowledge (articulating growth consolidates it)
-- say_harder_than_expected → no resource change (emotional relief only)
-- say_things_are_fine      → no change
-- keep_walking             → no change
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'say_getting_used_to_it' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 1}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's25_parent_call_2';


-- ============================================================
-- s26_late_library — late-night study sessions reward persistence
-- sit_at_usual_table   → +3 knowledge (reliable routine)
-- try_different_table  → +2 knowledge, +1 socialLeverage (slight disruption,
--                         might meet someone)
-- stand_and_observe    → no change (reflective, not active)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'sit_at_usual_table' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"knowledge": 3}'::jsonb
              )
            )
          )
        WHEN choice->>'id' = 'try_different_table' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                'resources',
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb)
                  || '{"knowledge": 2, "socialLeverage": 1}'::jsonb
              )
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's26_late_library';
