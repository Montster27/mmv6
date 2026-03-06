-- Migration 0133: Seed resource-gated content for Arc One
--
-- Demonstrates the resource system wired in the resource_system branch by
-- adding requires_resource / costs_resource fields to existing choices and
-- creating one new storylet that only surfaces for health-focused players.
--
-- Changes:
-- 1. s3_dining_hall  — "approach_miguel" costs 5 cash; grants +2 socialLeverage
-- 2. s13_miguel_party_invite — "go_to_party" (cover charge) requires 15 cash
-- 3. s14_marsh_office_hours — "ask_about_paper" (hard question) requires 20 knowledge
-- 4. NEW s_gym_early_access — health storylet gated at 30 physicalResilience
--
-- Touch updated_at on all modified rows to bust the localStorage catalog cache.

-- ============================================================
-- 1. s3_dining_hall — "approach_miguel"
--    Cost: 5 cash (buying a coffee)
--    Reward: +2 socialLeverage (a real conversation with Miguel)
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'approach_miguel' THEN
          choice
            || jsonb_build_object(
                 'costs_resource',
                 jsonb_build_object('key', 'cashOnHand', 'amount', 5)
               )
            || jsonb_build_object(
                 'outcome',
                 jsonb_build_object(
                   'deltas',
                   jsonb_build_object(
                     'resources',
                     jsonb_build_object('socialLeverage', 2)
                   )
                 )
               )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's3_dining_hall';

-- ============================================================
-- 2. s13_miguel_party_invite — "go_to_party"
--    Cover charge: requires 15 cash to attend the full party.
--    "go_briefly" (stop in for free) and "decline_party" remain ungated.
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'go_to_party' THEN
          choice || jsonb_build_object(
            'requires_resource',
            jsonb_build_object('key', 'cashOnHand', 'min', 15),
            'costs_resource',
            jsonb_build_object('key', 'cashOnHand', 'amount', 15)
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's13_miguel_party_invite';

-- ============================================================
-- 3. s14_marsh_office_hours — "ask_about_paper"
--    Intellectual gate: requires 20 knowledge to confidently engage
--    with the hard question. Other choices remain ungated.
-- ============================================================
UPDATE public.storylets
SET
  choices = (
    SELECT jsonb_agg(
      CASE
        WHEN choice->>'id' = 'ask_about_paper' THEN
          choice || jsonb_build_object(
            'requires_resource',
            jsonb_build_object('key', 'knowledge', 'min', 20)
          )
        ELSE choice
      END
    )
    FROM jsonb_array_elements(choices) AS choice
  ),
  updated_at = NOW()
WHERE slug = 's14_marsh_office_hours';

-- ============================================================
-- 4. NEW: s_gym_early_access
--    Only surfaces for players who have been investing in health.
--    Tags: arc_one_core, health
--    Gate: requires_physical_resilience_min: 30
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's_gym_early_access',
  'Early Hours',
  $$The rec center opens at 6am. Most people do not know this.

You have been going often enough that the morning staff knows your face. Today the attendant waves you toward the free weights without making you scan your card.

You have forty minutes before your first class. The gym is almost empty. The light is different at this hour.

There is a new climbing wall in the back corner. You have been watching it since it opened. You have not tried it.$$,
  '[
    {
      "id": "try_climbing_wall",
      "label": "Try the climbing wall.",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "health"],
      "outcome": {
        "text": "You fall off three times. On the fourth attempt you make it halfway up.\n\nYour forearms are on fire. You schedule another session in your head before you have even changed.",
        "deltas": {
          "energy": -5,
          "resources": {
            "physicalResilience": 10
          }
        }
      }
    },
    {
      "id": "regular_workout",
      "label": "Stick to your usual routine.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["achievement", "health"],
      "outcome": {
        "text": "Forty minutes. Nothing dramatic. You are better at this than you were two weeks ago.",
        "deltas": {
          "energy": -3,
          "resources": {
            "physicalResilience": 5
          }
        }
      }
    },
    {
      "id": "skip_today",
      "label": "You are tired. Go back to the dorm.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "outcome": {
        "text": "The walk back takes four minutes. You fall asleep for another hour."
      }
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'health']::text[],
  true,
  '{"min_day_index": 5, "max_day_index": 30, "max_total_runs": 3, "requires_physical_resilience_min": 30}'::jsonb
);
