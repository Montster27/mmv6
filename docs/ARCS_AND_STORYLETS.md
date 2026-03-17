# Arcs and Storylets — Data Fields Reference

This document covers every data field used in the arc and storylet systems, with descriptions of what each field does. It also explains how arcs are structured and how new arcs are created.

---

## Overview: Two Content Types

The `storylets` table stores two kinds of narrative content that share the same schema but serve different roles:

| Type | Purpose | Identified by |
|---|---|---|
| **FSM arc beat steps** | Sequenced story moments driven by a finite-state machine; shown in "Today's Moments" during Arc One | `arc_id`, `step_key`, `order_index` all set |
| **Narrative storylets** | Standalone or loosely tagged story events drawn from weighted pools each day | `arc_id` is null (or set with `arc_key` tag only) |

---

## `Storylet` Fields

Defined in `src/types/storylets.ts` and stored in `public.storylets`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (uuid) | Primary key. Auto-generated. |
| `slug` | `string` | Human-readable unique identifier. FSM steps use the pattern `arc_{arc_key}_{step_key}` (e.g. `arc_roommate_roommate_s1_first_conversation`). Narrative storylets use descriptive slugs (e.g. `student-loan-reality`). |
| `title` | `string` | Short heading shown at the top of the card. |
| `body` | `string` | The narrative paragraph shown to the player. Supports `\n` line breaks. |
| `choices` | `StoryletChoice[]` | Array of options the player can pick. |
| `is_active` | `boolean` | Whether this storylet is eligible to be surfaced. Set to `false` to retire content. |
| `created_at` | `string` (ISO timestamp) | When the row was inserted. |
| `tags` | `string[]` | Arbitrary tags used for filtering and theming (e.g. `["arc_one","academic"]`). |
| `requirements` | `Record<string, unknown>` | Conditions the player must meet for this storylet to be eligible (e.g. resource minimums, flags). |
| `weight` | `number` | Relative probability weight used when drawing from the narrative storylet pool. Higher = more likely. |
| `introduces_npc` | `string[]` | NPC ids this storylet introduces. On first encounter, the engine prepends a brief intro blurb to `body`. All listed NPCs are auto-marked as met after any choice is taken — no `requires_npc_met` gate needed. |
| `arc_id` | `string \| null` | Foreign key to `arc_definitions.id`. Set for FSM arc beat steps; null for standalone storylets. |
| `step_key` | `string \| null` | Unique key within the arc FSM (e.g. `roommate_s1_first_conversation`). Used to match the instance's `current_step_key`. |
| `order_index` | `number \| null` | Display/sequencing order within the arc. Lower values are earlier steps. |
| `due_offset_days` | `number \| null` | Days after arc start when this step becomes due. Step is not shown before `started_day + due_offset_days`. |
| `expires_after_days` | `number \| null` | Window (in days) after the step becomes due during which it can be completed. After this window, the beat expires and the arc can advance or fail. |
| `default_next_step_key` | `string \| null` | The step to advance to after this one completes, when no choice specifies a `next_step_key`. |

---

## `StoryletChoice` Fields

Each element in `Storylet.choices`. Defined in `src/types/storylets.ts`.

### Identity

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique id for this choice within the storylet (e.g. `volunteer_real`, `keep_surface`). Also stored as `option_key` in legacy arc_steps seeding. |
| `label` | `string` | Button text shown to the player. |

### Outcome — Deterministic

| Field | Type | Description |
|---|---|---|
| `outcome` | `StoryletOutcome` | A single fixed outcome applied when this choice is taken. |
| `outcome.text` | `string` | Narrative result text (rarely used; prefer `reaction_text`). |
| `outcome.deltas.energy` | `number` | Direct energy change. |
| `outcome.deltas.stress` | `number` | Direct stress change. |
| `outcome.deltas.vectors` | `Record<string, number>` | Changes to personality/alignment vectors. |
| `outcome.deltas.resources` | `Partial<Record<ResourceKey, number>>` | Resource grants (positive) or costs (negative). |
| `outcome.anomalies` | `string[]` | Anomaly event ids to fire. |

### Outcome — Probabilistic

| Field | Type | Description |
|---|---|---|
| `outcomes` | `StoryletOutcomeOption[]` | Array of weighted possible outcomes. One is drawn at random (weighted by `weight` and optional `modifiers`). |
| `outcomes[].id` | `string` | Id for this outcome variant. |
| `outcomes[].weight` | `number` | Base probability weight. |
| `outcomes[].modifiers.vector` | `string` | Name of a player vector to read for scaling. |
| `outcomes[].modifiers.per10` | `number` | Weight adjustment per 10 points of the named vector. |
| `check` | `Check` | Skill check definition. Determines which outcome branch fires. |

### Costs & Rewards

| Field | Type | Description |
|---|---|---|
| `energy_cost` | `number` | Energy deducted when this choice is taken. Shown as `−N energy` on the button. |
| `time_cost` | `number` | Time blocks consumed. |
| `costs.resources` | `Partial<Record<ResourceKey, number>>` | Resources deducted (structured arc-style costs, complementary to `outcome.deltas`). |
| `costs.skill_points` | `number` | Skill points deducted. |
| `costs.dispositions` | `Record<string, number>` | NPC disposition changes as costs. |
| `rewards.resources` | `Partial<Record<ResourceKey, number>>` | Resources granted. |
| `rewards.skill_points` | `number` | Skill points granted. |
| `rewards.dispositions` | `Record<string, number>` | NPC disposition bonuses. |
| `costs_resource` | `{ key: ResourceKey; amount: number }` | Deducts a resource when choice is selected (simple single-resource gate+cost). |

### Gates (Requirements)

| Field | Type | Description |
|---|---|---|
| `requires_resource` | `{ key: ResourceKey; min: number }` | Player must hold this resource at or above `min` to see this choice. |
| `skill_requirement` | `string` | Skill the player must have to unlock this choice. |
| `money_requirement` | `"tight" \| "okay" \| "comfortable"` | Player's money band must be at least this level. |
| `condition` | `Record<string, unknown>` | Arbitrary eligibility condition object evaluated by the engine. |

### Navigation

| Field | Type | Description |
|---|---|---|
| `targetStoryletId` | `string` | Jump to any specific storylet by id (same or different arc). |
| `next_step_key` | `string \| null` | Advance the arc FSM to this step key after the choice is resolved. Overrides `default_next_step_key` on the parent step. |

### FSM Effects

| Field | Type | Description |
|---|---|---|
| `sets_stream_state` | `{ stream: string; state: string }` | Transition a named stream to a new FSM state (e.g. sets relationship tone). |
| `sets_expired_opportunity` | `"academic" \| "social" \| "financial"` | Marks a named opportunity type as expired for this run. |
| `money_effect` | `"improve" \| "worsen"` | Shifts the player's money band up or down one level. |
| `outcome_type` | `"success" \| "fail" \| "neutral"` | Records the tone of this resolution in logs and can gate future content. |
| `precludes` | `string[]` | Ids of other choices that become unavailable after this one is taken. |

### Narrative / Social

| Field | Type | Description |
|---|---|---|
| `reaction_text` | `string \| null` | Text shown immediately after the player picks this option, before the Continue button. Should be 1–3 sentences of narrative reaction. |
| `reaction_text_conditions` | `Array<{ if, text, relational_effects?, set_npc_memory? }>` | Conditional reaction text — different text fires depending on player state at resolution time. |
| `relational_effects` | `Record<string, Record<string, number>>` | NPC relationship dimension changes keyed by `npc_id` → `{ trust, respect, ... }`. |
| `set_npc_memory` | `Record<string, Record<string, boolean>>` | Set boolean memory flags on NPCs (e.g. `{ "miguel": { "knows_major": true } }`). |
| `events_emitted` | `Array<{ npc_id, type, magnitude? }>` | Narrative events broadcast to the NPC event bus. |
| `identity_tags` | `string[]` | Tags written to the player's identity profile when this choice is taken. |
| `skill_modifier` | `string` | Skill affected by or contributing to this choice's outcome. |

---

## `ArcDefinition` Fields

Stored in `public.arc_definitions`. Defines one narrative arc (a stream of related story beats).

| Field | Type | Description |
|---|---|---|
| `id` | `string` (uuid) | Primary key. Auto-generated. |
| `key` | `string` | Short unique slug (e.g. `arc_roommate`, `arc_academic`). Used in slugs and FSM state lookups. Must be unique. |
| `title` | `string` | Display name (e.g. "The Roommate"). |
| `description` | `string` | Narrative logline for the arc, used in authoring/debug tools. |
| `tags` | `string[]` (jsonb) | Categorisation tags (e.g. `["relationship", "arc_one"]`). |
| `is_enabled` | `boolean` | Whether this arc is active for all new runs. Set to `false` to disable without deleting. |

---

## `ArcInstance` Fields

Stored in `public.arc_instances`. One row per user per arc — tracks where a specific player is in an arc's FSM.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (uuid) | Primary key. |
| `user_id` | `string` | The player this instance belongs to. |
| `arc_id` | `string` | Foreign key to `arc_definitions.id`. |
| `state` | `"ACTIVE" \| "COMPLETED" \| "FAILED" \| "ABANDONED"` | Current lifecycle state of this arc for this player. Only `ACTIVE` instances surface beats. |
| `current_step_key` | `string` | The `step_key` of the step the player must complete next. Matched against `storylets.step_key`. |
| `step_due_day` | `number` | The game day on which `current_step_key` becomes due. Beat not shown before this day. |
| `step_defer_count` | `number` | How many times the current step has been deferred without resolution. |
| `started_day` | `number` | Game day when this arc instance was created. |
| `updated_day` | `number` | Game day of the last state change. |
| `completed_day` | `number \| null` | Game day when the arc reached `COMPLETED`. Null if still active or failed. |
| `failure_reason` | `string \| null` | Human-readable reason if `state = "FAILED"`. |
| `branch_key` | `string \| null` | Optional branch identifier for arcs with diverging paths. |

---

## `ArcOffer` Fields

Stored in `public.arc_offers`. Represents a displayed offer to start an arc (shown before the player commits).

| Field | Type | Description |
|---|---|---|
| `id` | `string` (uuid) | Primary key. |
| `user_id` | `string` | The player this offer belongs to. |
| `arc_id` | `string` | Which arc is being offered. |
| `offer_key` | `string` | Offer variant key (for A/B or tone variation). |
| `state` | `"ACTIVE" \| "ACCEPTED" \| "EXPIRED" \| "DISMISSED"` | Lifecycle state of the offer. |
| `times_shown` | `number` | How many times this offer has been presented to the player. |
| `tone_level` | `number` | Escalation level of the offer's framing (0 = gentle, higher = urgent). |
| `first_seen_day` | `number` | Game day when this offer was first shown. |
| `last_seen_day` | `number` | Game day when this offer was most recently shown. |
| `expires_on_day` | `number` | Game day after which this offer is no longer valid. |

---

## `ChoiceLogEntry` Fields

Stored in `public.choice_log`. Immutable audit trail of every meaningful arc event.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (uuid) | Primary key. |
| `user_id` | `string` | The player. |
| `day` | `number` | Game day of the event. |
| `event_type` | `LogEventType` | One of: `OFFER_SHOWN`, `ARC_STARTED`, `STEP_DEFERRED`, `STEP_RESOLVED`, `STEP_EXPIRED`, `ARC_ABANDONED`, `ARC_FAILED`, `ARC_COMPLETED`, `OFFER_EXPIRED`. |
| `arc_id` | `string \| null` | Which arc the event belongs to. |
| `arc_instance_id` | `string \| null` | Which instance row was affected. |
| `step_key` | `string \| null` | Which step was resolved/expired/deferred. |
| `offer_id` | `string \| null` | Which offer was shown/accepted/expired. |
| `option_key` | `string \| null` | Which choice the player picked (for `STEP_RESOLVED`). |
| `delta` | `Record<string, unknown> \| null` | Resource/state changes applied by this event. |
| `meta` | `Record<string, unknown> \| null` | Additional context (e.g. FSM state transitions). |

---

## How Arcs Are Created

### 1. Define the Arc

Add a row to `arc_definitions` with a unique `key`, a title, description, and tags. Set `is_enabled = true`.

```sql
INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
VALUES (
  'arc_roommate',
  'The Roommate',
  'A relationship you didn''t choose. The housing office did.',
  '["relationship","arc_one"]'::jsonb,
  true
);
```

### 2. Author the Steps

Each step is a row in `public.storylets` (or `arc_steps` in the legacy migration path, which migration 0139 unified). Steps require `arc_id`, `step_key`, `order_index`, `due_offset_days`, and `expires_after_days`.

```sql
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options,
   default_next_step_key, due_offset_days, expires_after_days)
SELECT
  d.id,
  'roommate_s1_first_conversation',
  1,
  'First Real Conversation',
  'He''s there when you wake up. Small talk is inevitable...',
  '[
    {
      "option_key": "volunteer_real",
      "label": "Volunteer something real about yourself",
      "energy_cost": 1,
      "reaction_text": "Something shifted. You gave him a real answer...",
      "sets_stream_state": {"stream": "roommate", "state": "genuine_connection"}
    },
    {
      "option_key": "keep_surface",
      "label": "Ask him questions — keep it surface for now",
      "energy_cost": 0,
      "reaction_text": "Safe. He seemed happy enough to talk...",
      "sets_stream_state": {"stream": "roommate", "state": "neutral_start"}
    }
  ]'::jsonb,
  'roommate_s2_routine_friction',  -- default_next_step_key
  0,   -- due day 1 (started_day + 0)
  2    -- expires 2 days after it becomes due
FROM public.arc_definitions d WHERE d.key = 'arc_roommate';
```

**Step sequencing rules:**
- `due_offset_days = 0` → due on the arc's start day (day 1 for Arc One)
- `expires_after_days` → gives the player a window; after this the beat disappears (step may be marked failed)
- `default_next_step_key` → where the instance advances after resolution (can be overridden per-choice via `next_step_key`)

### 3. Arc Instances Are Auto-Created

When Arc One begins (day 1, `arcOneScarcityEnabled = true`), `buildInitialArcInstances()` creates one `arc_instances` row per enabled arc definition. Each instance starts at `current_step_key = firstStep.step_key` and `step_due_day = startedDay + firstStep.due_offset_days`.

```
arc_definitions (6 arcs)
       │
       └─► arc_instances (6 rows, one per arc, per user)
                 │
                 └─► current_step_key points to first arc_steps row
```

### 4. Beats Are Surfaced Daily

`selectArcBeats()` runs each time the play page loads. It:
1. Finds all `ACTIVE` instances for the user
2. Looks up each instance's `current_step_key` in the unified `storylets` table
3. Checks `step_due_day <= today <= step_due_day + expires_after_days`
4. Sorts eligible beats by earliest expiry first (most urgent at top)
5. Returns up to `maxBeats` (default: 2) beats

### 5. Player Resolves a Beat

When the player picks an option, the engine:
1. Applies resource deltas (`costs`, `rewards`, `energy_cost`)
2. Fires any FSM effects (`sets_stream_state`, `money_effect`, etc.)
3. Records to `choice_log` with `event_type = "STEP_RESOLVED"`
4. Advances the instance: `current_step_key = choice.next_step_key ?? step.default_next_step_key`
5. Sets new `step_due_day` based on the next step's `due_offset_days`
6. If no next step exists, marks instance `state = "COMPLETED"`

### 6. Day Completion in arcOneMode

During Arc One (days 1–7 with `arcOneScarcityEnabled = true`):
- The traditional storylet section is hidden
- Only arc beat cards are shown in "Today's Moments"
- When the player resolves all beats for the day, `markDailyComplete` is called automatically
- If the player returns to the page with all beats already resolved (from a prior session), a `useEffect` fires `markDailyComplete` on load

---

## Beat Selection Summary

```
arc_definitions  ──► is_enabled?
arc_instances    ──► state = ACTIVE?
                     current_step_key matches a step?
                     step_due_day <= today?
                     today <= step_due_day + expires_after_days?
                         │
                         └─► DueStep[] sorted by expires_on_day ASC
                                   │
                                   └─► slice(0, maxBeats=2)
```

---

## File Locations

| File | Purpose |
|---|---|
| `src/types/storylets.ts` | TypeScript types for `Storylet`, `StoryletChoice`, `StoryletRun` |
| `src/domain/arcs/types.ts` | TypeScript types for `ArcDefinition`, `ArcStep`, `ArcInstance`, `ArcOffer`, `ChoiceLogEntry` |
| `src/core/arcs/selectArcBeats.ts` | Beat selection and initial instance construction logic |
| `supabase/migrations/0089_arc_refactor_core.sql` | DB schema for all arc tables |
| `supabase/migrations/0138_seed_arc_one_streams.sql` | Seeds the 6 Arc One stream definitions and their FSM steps |
| `supabase/migrations/0139_unify_storylets_arc_steps.sql` | Migrates `arc_steps` rows into the unified `storylets` table |
| `content/storylets/arc-one.json` | Narrative storylets for Arc One (drawn from the weighted pool) |
| `src/components/play/ArcBeatCard.tsx` | React component that renders a single arc beat card |
| `src/app/(player)/play/page.tsx` | Play page: manages arc instances, beat resolution, daily completion |
