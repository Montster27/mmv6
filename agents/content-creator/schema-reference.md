# MMV Storylet Schema Reference

## Overview

Storylets are stored in Supabase as rows in the `storylets` table. Content is authored as JSON and inserted via SQL migrations. This document defines every field the content creation agent must produce.

---

## Storylet (Top Level)

```typescript
{
  slug: string,           // Unique identifier, snake_case (e.g. "s01_dining_first_dinner")
  title: string,          // Human-readable title (e.g. "The Tables")
  body: string,           // Scene prose before choices appear. Use \n for line breaks.
  choices: Choice[],      // 2-4 choice options (see below)
  tags: string[],         // Content tags for filtering (e.g. ["arc_one", "belonging", "social"])
  requirements: object,   // Gates for storylet eligibility (see Requirements section)
  weight: number,         // Selection weight (default 100). Higher = more likely drawn.
  is_active: boolean,     // Whether this storylet is live
  introduces_npc: string[], // NPC IDs whose short_intro is prepended if not yet met
  // ── Track membership ────────────────────────────────────
  track_id: uuid | null,        // FK to tracks table (null = standalone)
  storylet_key: string | null,  // Unique key within the track
  order_index: number | null,   // Display order within track
  due_offset_days: number | null, // Days after track start this becomes available
  expires_after_days: number | null, // Window of availability after due
  default_next_key: string | null   // Next storylet_key if no choice specifies one
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
  requires_resource?: { key: ResourceKey, min: number }, // Gate: choice locked if below min
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
        physicalResilience?: number,
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
  next_key: string | null,         // Next storylet_key in the track (null = use default)
  targetStoryletId?: string,       // Cross-track jump to specific storylet

  // ── Track State Effects ───────────────────────────────────
  sets_track_state?: {
    state: string     // Target FSM state for this track
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
  precludes?: string[],    // Storylet slugs or track states this choice blocks

  // ── Skill ─────────────────────────────────────────────────
  skill_modifier?: string,     // Skill flag boosted (e.g. "practicalHustle")
  skill_requirement?: string   // Skill flag required to see this choice
}
```

---

## Resource System

### Valid Resource Keys

```
energy             — bounded 0-100, replenished by sleep
stress             — bounded 0-100, decays overnight
cashOnHand         — unbounded, earned via work allocation and storylet rewards
knowledge          — unbounded, earned via study allocation and storylet rewards
socialLeverage     — unbounded, earned via social allocation and storylet rewards
physicalResilience — bounded 0-100, earned via health allocation
```

### Resource Fields on Choices

**`requires_resource`** — a gate. The choice is locked/hidden if the player's resource is below `min`.
```json
{ "key": "cashOnHand", "min": 20 }
```
The player sees: _"Need 20 cash (have 5)"_ — the button is greyed out and disabled.

**`costs_resource`** — a deduction. The amount is subtracted when the choice is selected. The choice is also locked if the player cannot afford it.
```json
{ "key": "cashOnHand", "amount": 15 }
```
The player sees: _"−15 cash"_ on the button. If they have less than 15, the button is greyed out with _"Need 15 cash (have 5)"_.

**`outcome.deltas.resources`** — grants or penalties applied after the choice resolves (can be positive or negative).
```json
{ "cashOnHand": -10, "knowledge": 5 }
```

### Resource Validation Rules

When writing a storylet with resource effects, verify:

1. **Keys are valid** — only use the six keys listed above
2. **Costs are achievable** — can the player plausibly have enough by this game day?
   - Starting cash: ~$200-600
   - Daily allocation gains: ~$20-30 per resource
   - Week 1 players are resource-poor; don't gate high in early days
3. **Always provide an escape** — if one choice has `requires_resource` or `costs_resource`, at least one other choice in the storylet must NOT have that cost (so the player is never stuck)
4. **Narrative hints for gates** — if a choice is gated by a high resource, the storylet body text should hint at what's needed ("The hardcover textbooks are piled on the counter — $45 for the lot")
5. **No impossible gates** — don't set `requires_resource` at 20 AND `costs_resource` at 25 on the same key (the gate passes at 20 but the cost fails at 25)
6. **Amounts are positive** — `requires_resource.min` > 0, `costs_resource.amount` > 0

### Economy Guidance

| Day Range | Typical cashOnHand | Typical knowledge | Notes |
|-----------|-------------------|-------------------|-------|
| Day 1-3   | 200-400           | 0-30              | Players are exploring, not optimizing |
| Day 4-7   | 150-500           | 20-80             | First allocation choices kicking in |
| Day 8-14  | 100-600           | 50-150            | Divergence based on work/study focus |

---

## Relationship Event Types

Use these in `events_emitted`. Preferred over legacy `relational_effects`.

| Event | relationship | trust | reliability | emotionalLoad | Side effects |
|---|---|---|---|---|---|
| INTRODUCED_SELF | +1 | +1 | 0 | 0 | Sets met, knows_name, knows_face |
| SHARED_MEAL | +1 | +0.5 | +0.5 | 0 | Sets met, knows_face |
| SMALL_KINDNESS | +1 | +0.5 | +0.5 | 0 | — |
| SHOWED_UP | +1 | 0 | +1 | 0 | Sets met, knows_face |
| CONFIDED_IN | +1 | +1 | 0 | +1 | — |
| REPAIR_ATTEMPT | +1 | 0 | +1 | 0 | — |
| OVERHEARD_NAME | 0 | 0 | 0 | 0 | Sets knows_name |
| NOTICED_FACE | 0 | 0 | 0 | 0 | Sets knows_face |
| WENT_MISSING | -1 | 0 | -1 | 0 | — |
| DEFERRED_TENSION | 0 | 0 | -0.5 | 0 | Records a pattern |
| AWKWARD_MOMENT | -1 | -0.5 | 0 | 0 | — |
| CONFLICT_LOW | -1 | -1 | 0 | 0 | — |
| DISMISSED | -2 | -2 | 0 | 0 | — |
| DISRESPECT | -2 | -2 | -1 | 0 | — |
| CONFLICT_HIGH | -3 | -2 | -1 | 0 | — |

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
| npc_contact_wren | Wren | contact | Day 1 (quad - s_quad_reveal) |
| npc_parent_voice | your parent | family | Day 3-4 (dorm phone) |

---

## Track States (Chapter One)

### Roommate Track
`neutral_coexistence` | `genuine_connection` | `surface_tension` | `open_conflict` | `avoidance_pattern`

### Academic Track
`false_confidence` | `quiet_doubt` | `active_engagement` | `avoidance_spiral` | `found_a_thread`

### Money Track
`not_yet_felt` | `background_hum` | `friction_visible` | `active_stress` | `resolved`

### Belonging Track
`open_scanning` | `first_anchor` | `performing_fit` | `genuine_match` | `withdrawal`

### Opportunity Track
`undiscovered` | `noticed` | `considering` | `pursuing` | `committed` | `expired`

### Home Track
`clean_break` | `background_warmth` | `guilt_current` | `active_pull` | `identity_rupture`

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

// Track state gate
{
  "path": "stream_states.opportunity",
  "equals": "committed"
}

// Resource-level gate (storylet-level, hides entire storylet)
{ "requires_cash_min": 50 }
{ "requires_knowledge_min": 20 }
```

Operators: `all`, `any`, `not`, `path` + `equals`/`gte`/`lte`

---

## Identity Tags Reference

Used in `choice.identity_tags[]`. Drive the reflection engine's pillar analysis.

| Tag | Pillar Axis | Meaning |
|---|---|---|
| risk | Risk / Safety | Player chose the uncertain/exposed option |
| safety | Risk / Safety | Player chose the protected/known option |
| people | People / Achievement | Player prioritized connection over task |
| achievement | People / Achievement | Player prioritized task over connection |
| confront | Confront / Avoid | Player addressed tension directly |
| avoid | Confront / Avoid | Player deferred or sidestepped tension |

Most choices should have 1-2 identity tags. Some may have none (purely logistical choices). None should have more than 3.

---

## SQL Migration Format

Final content is delivered as a SQL migration file. Example structure:

```sql
BEGIN;

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, track_id, storylet_key, order_index, due_offset_days,
  expires_after_days, default_next_key
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
  (SELECT id FROM public.tracks WHERE key = 'track_key'),
  'storylet_key_here',
  1,
  0,
  NULL,
  'next_storylet_key_or_null'
);

COMMIT;
```

Note: Single quotes in body/reaction text must be escaped as `''` in SQL strings prefixed with `E'...'`.
