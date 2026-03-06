-- Migration 0135: Resource balance — tighten economy to create college-stress feel
--
-- Problems fixed:
--   1. Cash windfalls too large (+40 from stories vs ~35 total costs → 26 surplus)
--   2. No energy costs on late-night choices despite 0134 comment "energy cost"
--   3. Social leverage massively oversupplied (~56 from stories, max spend only 15)
--   4. physicalResilience gym gate (30) lower than starting value (50) → never fires
--   5. No stress cost on embarrassing/intimidating academic moments
--
-- Design target: player cannot do everything. Party vs. road trip is a real choice.
-- Late nights show up in tomorrow's energy bar. Gym access requires real health investment.
--
-- Applies on top of 0133 + 0134. Touch updated_at on every modified row.
-- ============================================================


-- ============================================================
-- SECTION 1: CASH CHAIN — reduce windfalls, raise costs
-- ============================================================

-- s10_parent_call_w1: ask_for_something +20 → +12 cash
-- (Parents help, but it's not a windfall; realistic parental support)
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
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"cashOnHand": 12}'::jsonb
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


-- s17_campus_job_table: apply_for_position +20 → +15 cash
-- (First paycheck is significant but not transformative)
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
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"cashOnHand": 15}'::jsonb
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


-- s13_miguel_party_invite: go_to_party requires/costs 15 → 18 cash
-- (Cover charge + drinks; a real spend that competes with road trip savings)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'go_to_party' THEN
          choice
            || jsonb_build_object(
                 'requires_resource',
                 jsonb_build_object('key', 'cashOnHand', 'min', 18)
               )
            || jsonb_build_object(
                 'costs_resource',
                 jsonb_build_object('key', 'cashOnHand', 'amount', 18)
               )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's13_miguel_party_invite';


-- s24_miguel_road_trip: raise both gates and costs
-- say_yes_to_trip: requires/costs 15 → 22 cash (road trip is expensive)
-- ask_for_time:    requires/costs  8 → 12 cash (even partial commitment hurts)
-- Social leverage grants unchanged (+5 / +2) — the payoff stays
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
                 jsonb_build_object('key', 'cashOnHand', 'min', 22)
               )
            || jsonb_build_object(
                 'costs_resource',
                 jsonb_build_object('key', 'cashOnHand', 'amount', 22)
               )
        WHEN choice->>'id' = 'ask_for_time' THEN
          choice
            || jsonb_build_object(
                 'requires_resource',
                 jsonb_build_object('key', 'cashOnHand', 'min', 12)
               )
            || jsonb_build_object(
                 'costs_resource',
                 jsonb_build_object('key', 'cashOnHand', 'amount', 12)
               )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's24_miguel_road_trip';


-- ============================================================
-- SECTION 2: ENERGY COSTS — late nights leave a mark
--
-- Energy goes in outcome.deltas directly (sibling of resources),
-- same as the gym storylet in 0133. Merging at the deltas level
-- preserves existing resource grants without touching them.
-- ============================================================

-- s11_cal_midnight
-- go_with_cal:       -5 energy (out until 2am, full late night)
-- invite_in_instead: -2 energy (short interruption, still disrupts sleep)
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
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"energy": -5}'::jsonb
            )
          )
        WHEN choice->>'id' = 'invite_in_instead' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"energy": -2}'::jsonb
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's11_cal_midnight';


-- s19_cal_bad_night
-- let_him_in:            -4 energy + socialLeverage 4→3
--   (losing sleep to support a friend is real cost; reduce the social leverage
--    slightly so the choice feels harder, not just generous)
-- check_in_through_door: -2 energy (brief but interrupted)
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
              -- add energy first, then overwrite resources.socialLeverage
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb)
                || '{"energy": -4}'::jsonb
                || jsonb_build_object(
                     'resources',
                     COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb)
                       || '{"socialLeverage": 3}'::jsonb
                   )
            )
          )
        WHEN choice->>'id' = 'check_in_through_door' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"energy": -2}'::jsonb
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's19_cal_bad_night';


-- s26_late_library
-- sit_at_usual_table:  -5 energy (staying until 1am, reliable but exhausting)
-- try_different_table: -4 energy (same late hour, slight variance)
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
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"energy": -5}'::jsonb
            )
          )
        WHEN choice->>'id' = 'try_different_table' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"energy": -4}'::jsonb
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's26_late_library';


-- ============================================================
-- SECTION 3: STRESS COSTS — academic pressure moments
-- ============================================================

-- s7_first_class: speak_wrong +5 stress
-- (Public embarrassment in a lecture hall; your face goes red,
--  your heart pounds. The day carries that.)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'speak_wrong' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"stress": 5}'::jsonb
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's7_first_class';


-- s14_marsh_office_hours: ask_about_paper +5 stress
-- (Engaging the intimidating professor is terrifying even when you
--  know the material; the knowledge gate shows you're ready, but
--  the stress cost shows it costs something to do hard things.)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'ask_about_paper' THEN
          choice || jsonb_build_object(
            'outcome',
            COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
              'deltas',
              COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || '{"stress": 5}'::jsonb
            )
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's14_marsh_office_hours';


-- ============================================================
-- SECTION 4: SOCIAL LEVERAGE — trim abundance
--
-- Reduce the largest grants so the road trip (15 social) feels
-- like a meaningful payoff, not a rounding error.
-- ============================================================

-- s9_orientation_fair: sign_up_something +4 → +2 social
-- (Signing up is a commitment, not an instant network; relationship
--  takes time to pay off beyond what the signup itself provides)
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


-- s16_jordan_first_talk: sit_down_and_talk +5 → +3 social
-- (A real connection but early days; the relationship hasn't
--  had time to become leverage yet)
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
                COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 3}'::jsonb
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


-- s20_radio_station: go_in
--   +6 → +4 social (still the biggest single-choice gain, but not a runaway)
--   ADD requires_resource: socialLeverage >= 8
--   (The radio station is a community; you can't walk in cold.
--    You need a track record of showing up socially first.)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'go_in' THEN
          choice
            || jsonb_build_object(
                 'requires_resource',
                 jsonb_build_object('key', 'socialLeverage', 'min', 8)
               )
            || jsonb_build_object(
                 'outcome',
                 COALESCE(choice->'outcome', '{}'::jsonb) || jsonb_build_object(
                   'deltas',
                   COALESCE(choice->'outcome'->'deltas', '{}'::jsonb) || jsonb_build_object(
                     'resources',
                     COALESCE(choice->'outcome'->'deltas'->'resources', '{}'::jsonb) || '{"socialLeverage": 4}'::jsonb
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
-- SECTION 5: PHYSICAL RESILIENCE GATE — make it meaningful
--
-- Starting physicalResilience = 50, but gym gate was 30.
-- Player never had to invest in health to unlock the gym.
-- Raise gate to 60: requires ~5 days of real health allocation
-- (40 health/day = +2/day; 50 + 10 = 60 after 5 days).
-- A player who ignores health stays at ~50-55 and never gets in.
-- ============================================================
UPDATE public.storylets
SET
  requirements = requirements || '{"requires_physical_resilience_min": 60}'::jsonb,
  updated_at = NOW()
WHERE slug = 's_gym_early_access';
