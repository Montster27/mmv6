# MMV Narrative Content Guide v3
## Unified Reference for AI-Assisted Content Authoring

> This document is the primary reference for generating new storylet and arc content. It consolidates the NPC system, arc/storylet data schemas, and player state into a single working guide. Read Section 0 before authoring any content.

---

## SECTION 0 — Testing Status and Open Items

The following systems are implemented in code but have **not yet been validated with real content**. Author test content first to confirm round-trip behaviour before writing production content that depends on these mechanics.

| System | Status | What Needs Testing |
|---|---|---|
| **Preclusion chain** | Code complete | Write a choice with `precludes: ["some-slug"]` and a second storylet with `requirements: { "requires_not_precluded": "some-slug" }`. Confirm the second storylet disappears after the first choice is taken. |
| **Identity tags → 3-axis tracking** | Code complete | Write choices with `identity_tags: ["risk"]`, `["safety"]`, `["people"]`, `["achievement"]`, `["confront"]`, `["avoid"]`. Confirm counters increment in `daily_states.life_pressure_state`. |
| **`reaction_text_conditions`** | Implemented | Write a choice with conditional reaction text keyed on player state (e.g. money band). Confirm the correct branch fires. |
| **`requires_resource` gate on choices** | Implemented | Write a choice with `requires_resource: { key: "cashOnHand", min: 50 }`. Confirm it hides when the player is below the minimum. |
| **`money_effect: "improve" / "worsen"`** | Implemented | Write a choice with `money_effect: "worsen"`. Confirm `money_band` shifts down in `daily_states`. |
| **`sets_expired_opportunity`** | Implemented | Write a choice with `sets_expired_opportunity: "academic"`. Confirm content gated on that opportunity type stops surfacing. |
| **`next_step_key` override** | Implemented | Write an arc beat step where one choice sets `next_step_key` to skip a step. Confirm the instance's `current_step_key` advances to the override, not `default_next_step_key`. |
| **Day complete when all arc beats resolved** | Implemented (recent) | Resolve all arc beats in a single day session. Confirm "Daily complete" appears. Return next session and confirm day is already marked complete. |
| **NPC auto-introduction prepend** | Implemented | Write a storylet with `introduces_npc: ["npc_floor_miguel"]` and trigger it when Miguel is unmet. Confirm `short_intro` text prepends to the body. Confirm `met` is set to `true` after any choice. |

> **Development workflow:** Generate test content (a small migration with 1–2 storylets), apply it, play through it, confirm each mechanic, then proceed to production content.

---

## SECTION 1 — System Overview

MMV stores all authored content in the `public.storylets` table. Two content types share this table:

| Type | When it appears | Key identifiers |
|---|---|---|
| **Arc beat step** | "Today's Moments" during Arc One (days 1–7) — sequenced, FSM-driven | `arc_id` set, `step_key` set, `order_index` set |
| **Narrative storylet** | Daily storylet draws — weighted pool, up to 3 per day | `arc_id` null, drawn by weight and requirements |

Content drives four interacting state systems:

```
Player State
├── Resources       (energy, cashOnHand, knowledge, socialLeverage, physicalResilience, stress)
├── Player Pressure  (risk, safety, people, achievement, confront, avoid — the 3-axis model)
├── Skill Flags     (studyDiscipline, socialEase, assertiveness, practicalHustle)
├── Money Band      (tight | okay | comfortable)
└── NPC Relationships
    ├── Core state   (met, knows_name, knows_face, relationship 1–10, trust, reliability, emotionalLoad)
    └── Memory flags (arbitrary booleans set by content — see Section 5)
```

Every meaningful choice should touch at least one of these systems.

---

## SECTION 2 — Player State Reference

### Resources (numeric)

Stored in `daily_states` and `player_day_states`. All are integers except where noted.

| Resource key | Description | Typical range |
|---|---|---|
| `energy` | Capacity to act. Low energy makes confrontation choices harder. | 0–100 |
| `stress` | Accumulated pressure. High stress reduces effective energy regeneration. | 0–100 |
| `cashOnHand` | Liquid money. Gates some choices; affected by `money_effect`. | 0+ |
| `knowledge` | Academic/intellectual capital. | 0+ |
| `socialLeverage` | Social capital — connections, reputation. | 0+ |
| `physicalResilience` | Physical health buffer. | 0+ |

### Money Band

Derived from `cashOnHand` trajectory. Stored as `daily_states.money_band`.

| Value | Effect |
|---|---|
| `"tight"` | Some choices unavailable; stress indicator rises; `money_requirement: "okay"` choices are blocked |
| `"okay"` | Standard access |
| `"comfortable"` | Some friction removed; certain social opportunities unlocked |

Choices shift the band via `money_effect: "improve"` or `money_effect: "worsen"`.

### Energy Level

Derived from `energy` value. Stored as `daily_states.energy_level`.

| Value | Threshold | Effect |
|---|---|---|
| `"high"` | energy ≥ 70 | Full access to confrontation options; skill modifiers fully active |
| `"moderate"` | energy 40–69 | Baseline — most options available |
| `"low"` | energy < 40 | Avoidance options become more attractive; confrontation harder |

### Skill Flags (numeric counters)

Stored as `daily_states.skill_flags`. Increment via `skill_modifier` on choices.

| Flag key | Grows when | Modifies |
|---|---|---|
| `studyDiscipline` | Academic choices taken repeatedly | Outcome quality on academic challenges |
| `socialEase` | Connection choices; initiating with strangers | Success probability in relationship bids |
| `assertiveness` | Confronting instead of deferring | Confrontation outcomes; NPC trust response |
| `practicalHustle` | Work, logistics, self-sufficiency choices | Money band trajectory; practical opportunity access |

### 3-Axis Pressure Model (LifePressureState)

Stored as `daily_states.life_pressure_state`. Incremented via `identity_tags` on choices. Powers the Reflection Engine at arc end — never shown to the player directly.

| Tag | Axis | Description |
|---|---|---|
| `"risk"` | Risk ↔ Safety | Player chose exposure over protection |
| `"safety"` | Risk ↔ Safety | Player chose protection over exposure |
| `"people"` | People ↔ Achievement | Player prioritised connection |
| `"achievement"` | People ↔ Achievement | Player prioritised accomplishment |
| `"confront"` | Confront ↔ Avoid | Player met tension directly |
| `"avoid"` | Confront ↔ Avoid | Player deferred or avoided tension |

A single choice can carry multiple tags (e.g. `["risk", "people"]`).

---

## SECTION 3 — NPC Creation Workflow

Every new NPC requires entries in three places. Follow this checklist in order.

### Step 1 — Choose an ID

Use the pattern `npc_{role}_{firstname}` in lowercase. Examples:
- `npc_roommate_dana`
- `npc_floor_miguel`
- `npc_prof_marsh`

The ID must be unique across all arcs and chapters.

### Step 2 — Add to `NPC_REGISTRY`

File: `src/domain/npcs/registry.ts`

Add an entry to the `NPC_REGISTRY` array:

```typescript
{
  id: "npc_floor_miguel",
  name: "Miguel",
  short_intro: "Miguel Reyes, room 214 — from San Antonio, first on the floor to learn everyone's name",
}
```

`short_intro` is the text prepended to a storylet body on first encounter (when `introduces_npc` lists this NPC and `met === false`). Keep it under 20 words. Write in third person. It appears as `(short_intro.)` before the main body.

### Step 3 — Add to `relationships.ts`

File: `src/lib/relationships.ts`

Add the NPC to both:

**`ROLE_TAGS`** (maps id → role label):
```typescript
npc_floor_miguel: "orientation",
```

**`ALL_YEAR_ONE_NPCS`** (or the appropriate arc's NPC list when that pattern is extended):
```typescript
"npc_floor_miguel",
```

**`ensureRelationshipDefaults()`** (sets starting state):
```typescript
ensure("npc_floor_miguel", {
  met: false,
  knows_name: false,
  knows_face: false,
  role_tag: "orientation",
  relationship: 5,
});
```

**`NPC_DISPLAY_NAMES`** (used by `renderNpcName()` to reveal names once `knows_name` is true):
```typescript
npc_floor_miguel: "Miguel",
```

### Step 4 — Define starting state values

| If the NPC... | Set |
|---|---|
| Is already present before the game starts (roommate, family) | `met: true, knows_name: true, knows_face: true` |
| Needs to be formally introduced via storylet | `met: false, knows_name: false, knows_face: false` |
| Has a pre-existing warmer relationship | `relationship: 6` or `7` (default is `5`) |

### Step 5 — Write the introduction storylet

Create a storylet (or arc beat) that includes `introduces_npc: ["npc_new_id"]`. The engine will prepend the `short_intro` on first encounter and mark the NPC as `met` after any choice is taken. No manual `set_npc_memory` entry needed for the introduction itself.

---

## SECTION 4 — NPC Relationship State

All relationship data is stored in `daily_states.relationships` as JSONB, keyed by NPC id.

### `RelationshipState` fields

| Field | Type | Range | Description |
|---|---|---|---|
| `met` | boolean | — | Player has been introduced. Required for `requires_npc_met` gates. |
| `knows_name` | boolean | — | Player knows the NPC's name. Controls `renderNpcName()` output. |
| `knows_face` | boolean | — | Player recognises the NPC by sight. |
| `role_tag` | string | — | Static role label (`roommate`, `professor`, `ra`, etc.). Set once. |
| `relationship` | number | 1–10 | General warmth/closeness. Default 5. Clamped. |
| `trust` | number | −3 to +3 | Opens up / relies on player. Default 0. |
| `reliability` | number | −3 to +3 | Counts on player to follow through. Default 0. |
| `emotionalLoad` | number | 0–3 | Leaning on player emotionally. Default 0. |
| `updated_at` | string | ISO | Last change timestamp. |

### Relationship Events

The preferred way to change NPC state. Add to `events_emitted` on a choice.

```json
"events_emitted": [
  { "npc_id": "npc_floor_miguel", "type": "INTRODUCED_SELF", "magnitude": 1 }
]
```

| Event | `relationship` Δ | `trust` Δ | `reliability` Δ | `emotionalLoad` Δ | Side effects |
|---|---|---|---|---|---|
| `INTRODUCED_SELF` | +1 | +1 | 0 | 0 | Sets `met`, `knows_name`, `knows_face` |
| `WOKE_IN_SAME_ROOM` | 0 | 0 | 0 | 0 | Sets `met`, `knows_face` |
| `SHARED_MEAL` | +1 | +0.5 | +0.5 | 0 | Sets `met`, `knows_face` |
| `SMALL_KINDNESS` | +1 | +0.5 | +0.5 | 0 | — |
| `REPAIR_ATTEMPT` | +1 | 0 | +1 | 0 | — |
| `SHOWED_UP` | +1 | 0 | +1 | 0 | Sets `met`, `knows_face` |
| `CONFIDED_IN` | +1 | +1 | 0 | +1 | — |
| `OVERHEARD_NAME` | 0 | 0 | 0 | 0 | Sets `knows_name` |
| `NOTICED_FACE` | 0 | 0 | 0 | 0 | Sets `knows_face` |
| `WENT_MISSING` | −1 | 0 | −1 | 0 | — |
| `DEFERRED_TENSION` | 0 | 0 | −0.5 | 0 | Records pattern only |
| `AWKWARD_MOMENT` | −1 | −0.5 | 0 | 0 | — |
| `CONFLICT_LOW` | −1 | −1 | 0 | 0 | — |
| `DISRESPECT` | −2 | −2 | −1 | 0 | — |
| `DISMISSED` | −2 | −2 | 0 | 0 | — |
| `CONFLICT_HIGH` | −3 | −2 | −1 | 0 | — |

All deltas multiply by `magnitude` (default 1). All values are clamped after application.

### Relationship Thresholds and Their Effects

**trust:**
- `+2` or above → NPC offers extended dialogue; certain storylines unlock
- `−2` or below → NPC pulls back; some storylines unavailable

**reliability:**
- `+2` → NPC asks player for something important
- `−2` → NPC stops inviting player

**emotionalLoad:**
- `2` → some choices cost extra energy
- `3` → NPC crisis storyline becomes available or unavoidable

---

## SECTION 5 — NPC Memory Flags

Beyond the standard relationship metrics, choices can write arbitrary boolean flags onto an NPC's memory using `set_npc_memory`. These flags are free-form — content authors define them as needed.

### Syntax

```json
"set_npc_memory": {
  "npc_floor_miguel": {
    "knows_players_major": true,
    "borrowed_notes": true
  }
}
```

Flags are stored inside the NPC's entry in `daily_states.relationships` (the JSONB allows arbitrary keys beyond the standard fields).

### How to gate content on a memory flag

Use a `condition` path expression in `requirements` or on a choice:

```json
"condition": {
  "path": "relationships.npc_floor_miguel.knows_players_major",
  "equals": true
}
```

### Known / canonical flags (reference — add freely)

These have been used or planned in existing content. Use these names for consistency if the concept fits, or create new ones:

| Flag | Meaning |
|---|---|
| `knows_major` | NPC knows the player's declared major |
| `knows_hometown` | NPC knows where the player is from |
| `shared_meal` | NPC and player have eaten together |
| `borrowed_notes` | Player has borrowed or lent notes to this NPC |
| `confided_secret` | Player has shared something personal |
| `knows_financial_situation` | NPC is aware of player's money stress |
| `rejected_invitation` | Player turned down an invite from this NPC |
| `covered_for_player` | NPC covered for the player in a difficult moment |
| `conflict_unresolved` | A tension exists that has not been addressed |
| `asked_for_help` | Player has asked this NPC for help |

> **Guideline:** Name flags descriptively. Use `snake_case`. Flags should describe a specific event or known fact, not an emotional state (emotions belong in `trust`/`reliability`/`emotionalLoad`).

---

## SECTION 6 — Storylet Schema

### Storylet-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `slug` | string | Yes | Unique identifier. Narrative: descriptive kebab-case. Arc steps: `arc_{arc_key}_{step_key}`. |
| `title` | string | Yes | Short heading on the card (≤ 8 words). |
| `body` | string | Yes | Narrative paragraph. Second person, present tense. Supports `\n` line breaks. |
| `choices` | `StoryletChoice[]` | Yes | 2–4 options. |
| `is_active` | boolean | Yes | Set `true` to make live. |
| `tags` | string[] | Recommended | Used for weighted pool and posture filtering. |
| `weight` | number | Narrative only | Relative draw probability. Default 100. |
| `requirements` | object | Recommended | Eligibility conditions (see below). |
| `introduces_npc` | string[] | When relevant | NPC ids introduced on first encounter. |
| `arc_id` | string | Arc steps only | Foreign key to `arc_definitions.id`. |
| `step_key` | string | Arc steps only | Unique key within the arc. |
| `order_index` | number | Arc steps only | Sequence position (1-based). |
| `due_offset_days` | number | Arc steps only | Days after arc start when this step becomes due. |
| `expires_after_days` | number | Arc steps only | Days after `due_offset_days` before beat expires. |
| `default_next_step_key` | string | Arc steps only | Where the instance advances after completion. |

### Storylet requirements fields

These live in `requirements: { ... }` on the storylet object.

| Field | Type | Description |
|---|---|---|
| `requires_npc_met` | string[] | All listed NPC ids must have `met === true`. |
| `requires_npc_known` | string[] | All listed NPC ids must have `knows_name === true`. |
| `requires_npc_not_met` | string[] | All listed NPC ids must have `met !== true`. |
| `requires_not_precluded` | string | This storylet's own slug. If that slug is in `preclusion_gates`, this storylet is permanently closed. |
| `path` + `equals` | string, any | Arbitrary path check into player state. E.g. `{ "path": "relationships.npc_floor_miguel.trust", "equals": 2 }` |
| `all` | Requirement[] | All children must pass. |
| `any` | Requirement[] | At least one child must pass. |
| `not` | Requirement | Inverts a child. |

### `StoryletChoice` fields

#### Identity

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique id within this storylet's choices (e.g. `volunteer_real`). |
| `label` | string | Button text shown to the player. Keep under 10 words. Do not editorialize. |
| `reaction_text` | string \| null | Text shown after the player picks this option, before the Continue button. 1–3 sentences. |

#### Costs

| Field | Type | Description |
|---|---|---|
| `energy_cost` | number | Energy deducted on selection. Shown as `−N energy` on the button. Scale: `1` = light, `2` = moderate, `3` = significant. |
| `time_cost` | number | Time blocks consumed (1 or 2). |
| `costs.resources` | object | Resource deductions. E.g. `{ "cashOnHand": 20 }`. |
| `costs.skill_points` | number | Skill points deducted. |
| `costs_resource` | `{ key, amount }` | Single-resource cost gate and deduction combined. |
| `money_effect` | `"improve" \| "worsen"` | Shifts `money_band` one level up or down. |

#### Rewards

| Field | Type | Description |
|---|---|---|
| `rewards.resources` | object | Resource grants. E.g. `{ "knowledge": 10 }`. |
| `rewards.skill_points` | number | Skill points granted. |

#### Outcome (deterministic)

| Field | Type | Description |
|---|---|---|
| `outcome.deltas.energy` | number | Direct energy change (can be negative). |
| `outcome.deltas.stress` | number | Direct stress change. |
| `outcome.deltas.resources` | object | Resource changes applied on this outcome. |
| `outcome.text` | string | Narrative result text (rarely used; prefer `reaction_text`). |

#### Gates (requirements on individual choices)

| Field | Type | Description |
|---|---|---|
| `requires_resource` | `{ key, min }` | Player must hold this resource at or above `min` to see this choice. |
| `skill_requirement` | string | Skill flag required to unlock this choice. |
| `money_requirement` | `"tight" \| "okay" \| "comfortable"` | Player's money band must be at least this level. |
| `condition` | object | Arbitrary eligibility condition (path + equals, or NPC state). |

#### NPC effects

| Field | Type | Description |
|---|---|---|
| `events_emitted` | `Array<{ npc_id, type, magnitude? }>` | Preferred. Fires relationship events (see Section 4). |
| `relational_effects` | `Record<npc_id, { trust?, reliability? }>` | Legacy shorthand. Positive trust → `SMALL_KINDNESS` event; negative → `AWKWARD_MOMENT`. |
| `set_npc_memory` | `Record<npc_id, Record<flag, boolean>>` | Writes boolean memory flags onto NPC state. |

#### Player pressure and skills

| Field | Type | Description |
|---|---|---|
| `identity_tags` | string[] | Increments 3-axis counters. Values: `"risk"`, `"safety"`, `"people"`, `"achievement"`, `"confront"`, `"avoid"`. |
| `skill_modifier` | string | Skill flag incremented when this choice is taken. Values: `"studyDiscipline"`, `"socialEase"`, `"assertiveness"`, `"practicalHustle"`. |

#### FSM / arc effects

| Field | Type | Description |
|---|---|---|
| `sets_stream_state` | `{ stream, state }` | Transitions a named stream FSM to a new state. |
| `sets_expired_opportunity` | `"academic" \| "social" \| "financial"` | Marks an opportunity type as expired. |
| `outcome_type` | `"success" \| "fail" \| "neutral"` | Records resolution tone for logging and downstream gating. |
| `next_step_key` | string | Overrides `default_next_step_key` — advances the arc FSM to this specific step. |

#### Preclusion

| Field | Type | Description |
|---|---|---|
| `precludes` | string[] | Slugs added to `preclusion_gates` when this choice is taken. Any storylet with `requirements.requires_not_precluded` matching one of these slugs will never surface again. |

> ⚠️ **Needs test content** — see Section 0.

---

## SECTION 7 — Arc System

### Arc Definition

One row in `public.arc_definitions` per narrative arc.

| Field | Description |
|---|---|
| `key` | Short unique slug (e.g. `arc_roommate`). Used in step slugs and FSM state lookups. |
| `title` | Display name (e.g. "The Roommate"). |
| `description` | Narrative logline. Used in authoring tools. |
| `tags` | JSONB array. Include `"arc_one"` for Arc One streams. |
| `is_enabled` | Set `false` to disable without deleting. |

### Arc Step (stored as a Storylet with arc fields set)

Each step is a row in `public.storylets` (via the `arc_steps` migration path). Required arc-specific fields:

| Field | Description |
|---|---|
| `arc_id` | UUID of the parent `arc_definitions` row. |
| `step_key` | Unique within the arc (e.g. `roommate_s2_routine_friction`). |
| `order_index` | Sequence position (1-based). |
| `due_offset_days` | Days after arc `started_day` when this step becomes due. `0` = due on day 1. |
| `expires_after_days` | Window after `due_offset_days` before the beat expires unresolved. |
| `default_next_step_key` | Where the instance advances after resolution (unless a choice overrides with `next_step_key`). |

### Arc Instance (per player)

One row in `public.arc_instances` per user per arc. Created automatically when Arc One begins.

| Field | Description |
|---|---|
| `state` | `"ACTIVE" \| "COMPLETED" \| "FAILED" \| "ABANDONED"` |
| `current_step_key` | The step the player must complete next. |
| `step_due_day` | Game day when `current_step_key` becomes due. |
| `branch_key` | Optional diverging path identifier. |

### How Beat Selection Works

Each day, `selectArcBeats()` finds beats that are due today:

```
step_due_day <= today <= step_due_day + expires_after_days
```

Results are sorted soonest-to-expire first. Up to 2 beats surface per day.

### Stream FSM States (Arc One)

Each of the six Arc One streams has 5 states, advanced by `sets_stream_state` on choices. Initial states:

| Stream | Initial state | States available |
|---|---|---|
| `roommate` | `neutral_coexistence` | `genuine_connection`, `surface_tension`, `open_conflict`, `avoidance_pattern` |
| `academic` | `false_confidence` | `quiet_doubt`, `active_engagement`, `avoidance_spiral`, `found_a_thread` |
| `money` | `not_yet_felt` | `background_hum`, `friction_visible`, `active_stress`, `resolved` |
| `belonging` | `open_scanning` | `first_anchor`, `performing_fit`, `genuine_match`, `withdrawal` |
| `opportunity` | `undiscovered` | `noticed`, `pursuing`, `committed`, `expired` |
| `home` | `background_warmth` | `clean_break`, `guilt_current`, `active_pull`, `identity_rupture` |

---

## SECTION 8 — Content Authoring Patterns

### Pattern 1: Introducing a New NPC

```json
{
  "slug": "hall-phone-rings",
  "title": "The Phone",
  "introduces_npc": ["npc_floor_miguel"],
  "body": "The phone at the end of the hall rings. Someone has written 'FOR YOU' on the whiteboard above it.",
  "is_active": true,
  "tags": ["arc_one", "social"],
  "choices": [
    {
      "id": "answer_it",
      "label": "Answer it",
      "reaction_text": "It's for the guy two doors down. You take the message.",
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "identity_tags": ["people"]
    },
    {
      "id": "ignore_it",
      "label": "Leave it",
      "reaction_text": "You walk past. Someone else will get it.",
      "identity_tags": ["safety"]
    }
  ]
}
```

### Pattern 2: Gating on NPC State

```json
{
  "slug": "miguel-late-invite",
  "requirements": {
    "requires_npc_met": ["npc_floor_miguel"]
  },
  "body": "Miguel knocks. There's something happening at the student union.",
  "choices": [
    {
      "id": "go",
      "label": "Go with him",
      "energy_cost": 2,
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "identity_tags": ["people", "risk"]
    },
    {
      "id": "decline",
      "label": "Say you need to study",
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "WENT_MISSING", "magnitude": 1 }
      ],
      "identity_tags": ["safety", "achievement"]
    }
  ]
}
```

### Pattern 3: Preclusion Chain

Storylet A — the choice that closes a door:
```json
{
  "id": "take_the_shift",
  "label": "Sign up for the dining hall shift",
  "precludes": ["orientation-fair-day1"],
  "identity_tags": ["achievement", "safety"],
  "skill_modifier": "practicalHustle",
  "money_effect": "improve"
}
```

Storylet B — permanently closed once A is taken:
```json
{
  "slug": "orientation-fair-day1",
  "requirements": {
    "requires_not_precluded": "orientation-fair-day1"
  },
  "body": "The orientation fair is on the quad. Tables everywhere."
}
```

> ⚠️ Needs test content to validate — see Section 0.

### Pattern 4: NPC Memory Flags

```json
{
  "id": "tell_him_your_major",
  "label": "Mention what you're studying",
  "reaction_text": "He nods. Files it away.",
  "set_npc_memory": {
    "npc_floor_miguel": { "knows_major": true }
  }
}
```

Gate later content on the flag:
```json
{
  "slug": "miguel-study-reference",
  "requirements": {
    "path": "relationships.npc_floor_miguel.knows_major",
    "equals": true
  },
  "body": "Miguel mentions he found a study group for your major."
}
```

### Pattern 5: Arc Beat Step with Stream FSM Transition

```json
{
  "slug": "arc_roommate_roommate_s1_first_conversation",
  "arc_id": "<uuid of arc_roommate>",
  "step_key": "roommate_s1_first_conversation",
  "order_index": 1,
  "title": "First Real Conversation",
  "body": "She's there when you wake up. Small talk is inevitable.",
  "due_offset_days": 0,
  "expires_after_days": 2,
  "default_next_step_key": "roommate_s2_routine_friction",
  "is_active": true,
  "choices": [
    {
      "id": "volunteer_real",
      "label": "Volunteer something real about yourself",
      "energy_cost": 1,
      "reaction_text": "Something shifted in how she looked at you.",
      "sets_stream_state": { "stream": "roommate", "state": "genuine_connection" },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "CONFIDED_IN", "magnitude": 1 }
      ],
      "identity_tags": ["risk", "people"]
    },
    {
      "id": "keep_surface",
      "label": "Ask her questions — keep it surface for now",
      "energy_cost": 0,
      "reaction_text": "Safe. She seemed happy enough to talk.",
      "sets_stream_state": { "stream": "roommate", "state": "neutral_coexistence" },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "identity_tags": ["safety"]
    }
  ]
}
```

---

## SECTION 9 — Year One NPC Roster

| ID | Name | Role tag | Starting `met` | Short intro |
|---|---|---|---|---|
| `npc_roommate_dana` | Dana | `roommate` | `true` | "Dana, your roommate — already here when you arrived, still figuring each other out" |
| `npc_floor_miguel` | Miguel | `orientation` | `false` | "Miguel Reyes, room 214 — from San Antonio, first on the floor to learn everyone's name" |
| `npc_prof_marsh` | Prof. Marsh | `professor` | `false` | "Prof. Marsh, your English lecturer — known for calling on people who look unprepared" |
| `npc_studious_priya` | Priya | `classmate` | `false` | "Priya, from your sociology section — always three readings ahead, rarely wastes words" |
| `npc_floor_cal` | Cal | `floormate` | `false` | "Cal, two doors down — the kind of person who shows up when things get inconvenient" |
| `npc_ambiguous_jordan` | Jordan | `acquaintance` | `false` | "Jordan, someone you keep running into — their angle isn't clear yet" |
| `npc_ra_scott` | Scott | `ra` | `false` | "Scott, your RA — has seen this all before, handles it professionally anyway" |
| `npc_parent_voice` | your parent | `family` | `true` | *(no short_intro — always known)* |

> Additional NPCs for future arcs follow the creation workflow in Section 3.

---

## SECTION 10 — Content Writing Rules

These apply to all authored content. They are not style preferences — they are requirements.

**Do not name the pillar in the prose.** The player never sees "Belonging" or "Courage" as labels.

**Do not score the choice.** No narration indicates a choice was better or worse. Show what happened.

**Never write a decoy choice.** Every option must be genuinely plausible. An option the player would never take is friction, not a choice.

**`reaction_text` is mandatory on meaningful choices.** Every choice that changes player state should have reaction text. 1–3 sentences. Second person. Shows the immediate texture of the outcome without summarising its long-term meaning.

**Physical anchors are required in Arc One body text.** Every scene needs at least one grounding detail from the 1983 setting: a dorm hallway smell, a cassette player, a hand-written note on a whiteboard, a paper class schedule.

**Voice:** Second person, present tense. The player is "you." Show the situation. Trust the player to feel it.

**`identity_tags` are required on meaningful choices.** If a choice represents a pattern of behaviour, tag it. At least one tag per meaningful choice.

**Energy cost scale:**
- `1` = requires some effort but accessible (a casual conversation, a brief errand)
- `2` = moderate demand (an emotionally difficult conversation, a long study session)
- `3` = significant drain (confronting someone, a high-stakes social bid, crisis response)

---

## SECTION 11 — File Locations

| File | Purpose |
|---|---|
| `src/types/storylets.ts` | TypeScript types: `Storylet`, `StoryletChoice`, `StoryletRun` |
| `src/domain/arcs/types.ts` | TypeScript types: `ArcDefinition`, `ArcStep`, `ArcInstance`, `ArcOffer` |
| `src/core/arcOne/types.ts` | `LifePressureState`, `SkillFlags`, `MoneyBand`, `EnergyLevel`, `ArcOneState` |
| `src/types/arcOneStreams.ts` | Stream FSM state types and default values |
| `src/lib/relationships.ts` | `RelationshipState`, all event types and deltas, `applyRelationshipEvents()` |
| `src/domain/npcs/registry.ts` | `NPC_REGISTRY`, `short_intro` strings, `getDisplayBody()` |
| `src/core/storylets/selectStorylets.ts` | Storylet eligibility logic including NPC gates and preclusion checks |
| `src/core/arcs/selectArcBeats.ts` | Beat selection and initial instance construction |
| `supabase/migrations/0138_seed_arc_one_streams.sql` | Reference: how arc definitions and steps are seeded |
| `supabase/migrations/0139_unify_storylets_arc_steps.sql` | Reference: how arc_steps rows were migrated to the unified storylets table |
| `docs/ARCS_AND_STORYLETS.md` | Full field-by-field reference for arc and storylet data |
| `docs/NPC_DATA_REFERENCE.md` | Full field-by-field reference for NPC relationship data |
