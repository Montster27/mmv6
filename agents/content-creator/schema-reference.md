# MMV Storylet Schema Reference

## Overview

Storylets are stored in Supabase as rows in the `storylets` table. Content is authored as JSON and inserted via SQL migrations. This document defines every field the content creation agent must produce.

---

## Storylet (Top Level)

```typescript
{
  slug: string,           // Unique identifier, snake_case (e.g. "arc_people_fair_tables")
  title: string,          // Human-readable title (e.g. "The Tables")
  body: string,           // Scene prose before choices appear. Use \n for line breaks.
  choices: Choice[],      // 2-4 choice options (see below)
  tags: string[],         // Content tags for filtering (e.g. ["arc_one", "belonging", "social"])
  requirements: object,   // Gates for storylet eligibility (see Requirements section)
  weight: number,         // Selection weight (default 100). Higher = more likely drawn.
  is_active: boolean,     // Whether this storylet is live
  introduces_npc: string[], // NPC IDs whose short_intro is prepended if not yet met
  arc_id: uuid | null,    // FK to arc_definitions (null = standalone)
  step_key: string | null, // Unique key within the arc FSM
  order_index: number | null, // Display order within arc
  due_offset_days: number | null, // Days after arc start this becomes available
  expires_after_days: number | null, // Window of availability after due
  default_next_step_key: string | null // Next step if no choice specifies one
}
```

---

## Choice

Each choice represents one option the player can select.

```typescript
{
  // ── Identity ──────────────────────────────────────────────
  id: string,              // Unique within this storylet (e.g. "go_pizza")
  label: string,           // What the player sees. Short, physical, in-the-moment.

  // ── Costs ─────────────────────────────────────────────────
  time_cost: number,       // Time slots consumed (0-2)
  energy_cost: number,     // Energy consumed (0-3)
  money_requirement?: "tight" | "okay" | "comfortable", // Gate: requires this money band
  requires_resource?: { key: ResourceKey, min: number }, // Gate: requires resource level
  costs_resource?: { key: ResourceKey, amount: number }, // Deducted on selection

  // ── Outcome ───────────────────────────────────────────────
  outcome: {
    text: string,          // Can be empty string if reaction_text handles it
    deltas: {
      energy: number,      // Change to energy (negative = drain)
      stress: number,      // Change to stress (positive = more stressed)
      resources?: {        // Resource grants/costs
        cashOnHand?: number,
        knowledge?: number,
        socialLeverage?: number,
        // ... see ResourceKey type for full list
      }
    }
  },

  // ── Reaction Text ─────────────────────────────────────────
  reaction_text?: string,  // Prose shown after choice is selected. Primary narrative output.

  // For choices that vary by player state:
  reaction_text_conditions?: Array<{
    if: Record<string, unknown>,  // Condition to check (e.g. { money_band: "tight" })
    text: string,                  // Prose for this condition
    relational_effects?: Record<string, Record<string, number>>,
    set_npc_memory?: Record<string, Record<string, boolean>>
  }>,

  // ── Identity & Reflection ─────────────────────────────────
  identity_tags: string[], // Pillar tags: "risk", "safety", "people", "achievement",
                           // "confront", "avoid". Used by reflection engine.

  // ── Navigation ────────────────────────────────────────────
  next_step_key: string | null, // Next arc step (null = arc continues via default)
  targetStoryletId?: string,     // Cross-arc jump to specific storylet

  // ── Stream Effects ────────────────────────────────────────
  sets_stream_state?: {
    stream: string,   // Stream ID: "roommate", "academic", "money", "belonging",
                      //            "opportunity", "home"
    state: string     // Target state (must be valid for that stream's FSM)
  },
  sets_expired_opportunity?: "academic" | "social" | "financial",
  money_effect?: "improve" | "worsen",

  // ── NPC / Relational Effects ──────────────────────────────
  relational_effects?: Record<string, Record<string, number>>,
  // Example: { "npc_floor_miguel": { "trust": 1, "relationship": 2 } }

  set_npc_memory?: Record<string, Record<string, boolean>>,
  // Example: { "npc_floor_miguel": { "knows_hometown": true } }

  events_emitted?: Array<{
    npc_id: string,          // e.g. "npc_floor_miguel"
    type: string,            // Event type (see table below)
    magnitude?: number       // Scales all deltas (default 1)
  }>,

  // ── Preclusion ────────────────────────────────────────────
  precludes?: string[],    // Storylet slugs or stream states this choice blocks

  // ── Skill ─────────────────────────────────────────────────
  skill_modifier?: string,     // Skill flag boosted (e.g. "practicalHustle")
  skill_requirement?: string   // Skill flag required to see this choice
}
```

---

## Relationship Event Types

Use these in `events_emitted`. Preferred over legacy `relational_effects`.

| Event | relationship Δ | trust Δ | reliability Δ | emotionalLoad Δ | Side effects |
|---|---|---|---|---|---|
| INTRODUCED_SELF | +1 | +1 | 0 | 0 | Sets met, knows_name, knows_face |
| SHARED_MEAL | +1 | +0.5 | +0.5 | 0 | Sets met, knows_face |
| SMALL_KINDNESS | +1 | +0.5 | +0.5 | 0 | — |
| SHOWED_UP | +1 | 0 | +1 | 0 | Sets met, knows_face |
| CONFIDED_IN | +1 | +1 | 0 | +1 | — |
| REPAIR_ATTEMPT | +1 | 0 | +1 | 0 | — |
| OVERHEARD_NAME | 0 | 0 | 0 | 0 | Sets knows_name |
| NOTICED_FACE | 0 | 0 | 0 | 0 | Sets knows_face |
| WENT_MISSING | −1 | 0 | −1 | 0 | — |
| DEFERRED_TENSION | 0 | 0 | −0.5 | 0 | Records a pattern |
| AWKWARD_MOMENT | −1 | −0.5 | 0 | 0 | — |
| CONFLICT_LOW | −1 | −1 | 0 | 0 | — |
| DISMISSED | −2 | −2 | 0 | 0 | — |
| DISRESPECT | −2 | −2 | −1 | 0 | — |
| CONFLICT_HIGH | −3 | −2 | −1 | 0 | — |

---

## NPC Registry (Arc One)

| Key | Name | Role | Introduced |
|---|---|---|---|
| npc_roommate_dana | Dana | roommate | Day 1 (auto) |
| npc_floor_miguel | Miguel | orientation | Day 1 via introduces_npc |
| npc_floor_cal | Cal | floormate | Day 1 (floor meeting or hall) |
| npc_prof_marsh | Prof. Marsh | professor | Day 2 (first class) |
| npc_studious_priya | Priya | classmate | Day 2 (class or library) |
| npc_ambiguous_jordan | Jordan | acquaintance | Week 1 |
| npc_ra_scott | Scott | ra | Day 1 (floor meeting) |
| npc_contact_wren | Wren | contact | Day 1 (quad — s_quad_reveal) |
| npc_parent_voice | your parent | family | Day 3-4 (dorm phone) |

---

## Stream States (Arc One)

### Roommate Stream
`neutral_coexistence` → `genuine_connection` | `surface_tension` | `neutral_start` | `avoidance_start` → `open_conflict` | `avoidance_pattern`

### Academic Stream
`false_confidence` → `quiet_doubt` | `active_engagement` → `avoidance_spiral` | `found_a_thread`

### Money Stream
`not_yet_felt` → `tight` | `okay` | `comfortable` → `background_hum` | `friction_visible` | `active_stress` | `resolved`

### Belonging Stream
`open_scanning` → `first_anchor` → `performing_fit` | `genuine_match` | `withdrawal`

### Opportunity Stream
`undiscovered` → `discovered` | `noticed` | `considering` | `deferred` → `pursuing` | `committed` | `expired`

### Home Stream
`clean_break` | `background_warmth` → `guilt_current` | `active_pull` | `identity_rupture`

---

## Requirements (Storylet-Level Gates)

```json
// Simple: require NPC to be met
{ "requires_npc_met": ["npc_floor_miguel"] }

// Composed: require Miguel met AND Jordan NOT met
{
  "all": [
    { "requires_npc_met": ["npc_floor_miguel"] },
    { "not": { "requires_npc_met": ["npc_ambiguous_jordan"] } }
  ]
}

// Path check: require specific relationship level
{
  "path": "relationships.npc_roommate_dana.trust",
  "gte": 2
}

// Stream state gate
{
  "path": "stream_states.opportunity",
  "equals": "committed"
}
```

Operators: `all`, `any`, `not`, `path` + `equals`/`gte`/`lte`

---

## Identity Tags Reference

Used in `choice.identity_tags[]`. Drive the reflection engine's pillar analysis.

| Tag | Pillar Axis | Meaning |
|---|---|---|
| risk | Risk ↔ Safety | Player chose the uncertain/exposed option |
| safety | Risk ↔ Safety | Player chose the protected/known option |
| people | People ↔ Achievement | Player prioritized connection over task |
| achievement | People ↔ Achievement | Player prioritized task over connection |
| confront | Confront ↔ Avoid | Player addressed tension directly |
| avoid | Confront ↔ Avoid | Player deferred or sidestepped tension |

Most choices should have 1-2 identity tags. Some may have none (purely logistical choices). None should have more than 3.

---

## SQL Migration Format

Final content is delivered as a SQL migration file. Example structure:

```sql
BEGIN;

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'slug_here',
  'Title Here',
  E'Body text with \\n for line breaks and escaped single quotes like it''s.',
  '[JSON choices array]'::jsonb,
  ARRAY['tag1', 'tag2'],
  '{}'::jsonb,
  1,
  true,
  ARRAY['npc_id']::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_key'),
  'step_key_here',
  1,
  0,
  NULL,
  'next_step_key_or_null'
);

COMMIT;
```

Note: Single quotes in body/reaction text must be escaped as `''` in SQL strings prefixed with `E'...'`.
