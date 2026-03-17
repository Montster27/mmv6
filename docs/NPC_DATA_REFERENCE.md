# NPC Data Reference

This document covers the data tracked for each NPC, how that data is stored, how it changes through storylet choices, and how it gates or modifies storylet content.

---

## Storage Location

All NPC relationship data is stored per-player in `daily_states.relationships` as JSONB. The shape is a flat object keyed by NPC id:

```json
{
  "npc_roommate_dana": {
    "met": true,
    "knows_name": true,
    "knows_face": true,
    "role_tag": "roommate",
    "relationship": 6,
    "trust": 1,
    "reliability": 0,
    "emotionalLoad": 0,
    "updated_at": "2026-03-01T00:00:00.000Z"
  },
  "npc_floor_miguel": { ... }
}
```

A legacy `daily_states.npc_memory` JSONB field also exists and is migrated into `relationships` when encountered.

---

## `RelationshipState` Fields

Defined in `src/lib/relationships.ts`.

| Field | Type | Range | Description |
|---|---|---|---|
| `met` | `boolean` | — | Whether the player has been introduced to this NPC. Gates storylets that require a prior meeting. |
| `knows_name` | `boolean` | — | Whether the player has learned the NPC's name (can precede `met` if overheard). |
| `knows_face` | `boolean` | — | Whether the player recognises the NPC by sight. |
| `role_tag` | `string` | — | Static label describing the NPC's role (e.g. `roommate`, `professor`, `ra`). Set once on initialisation. |
| `relationship` | `number` | 1–10 | General warmth/closeness score. Initialised at 5 (Dana starts at 6, parents at 7). Clamped by `clampRelationship`. |
| `trust` | `number` | −3 to +3 | How much this NPC opens up to and relies on the player. Affects dialogue availability and certain storyline unlocks. |
| `reliability` | `number` | −3 to +3 | Whether the NPC counts on the player to follow through. Affects whether the NPC asks the player for help or invites them to things. |
| `emotionalLoad` | `number` | 0–3 | How much this NPC is leaning on the player emotionally. Higher values can trigger crisis storylines and increase energy cost of some choices. |
| `updated_at` | `string` | ISO timestamp | When this NPC's state last changed. |

### Starting Values

| NPC | `met` | `knows_name` | `knows_face` | `relationship` |
|---|---|---|---|---|
| `npc_roommate_dana` | `true` | `true` | `true` | 6 |
| `npc_parent_voice` | `true` | `true` | `true` | 7 |
| All others | `false` | `false` | `false` | 5 |

---

## Year One NPC Roster

| Key | Name | Role tag | Introduced |
|---|---|---|---|
| `npc_roommate_dana` | Dana | `roommate` | Day 1 (auto — already present) |
| `npc_floor_miguel` | Miguel | `orientation` | Day 1 via `introduces_npc` in hall/dining storylet |
| `npc_prof_marsh` | Prof. Marsh | `professor` | Day 2 (first class) |
| `npc_studious_priya` | Priya | `classmate` | Day 2 (class or library) |
| `npc_floor_cal` | Cal | `floormate` | Day 1 (floor meeting or hall) |
| `npc_ambiguous_jordan` | Jordan | `acquaintance` | Week 1 orientation or through Miguel |
| `npc_ra_sandra` | Sandra | `ra` | Day 1 (floor meeting) |
| `npc_parent_voice` | your parent | `family` | Day 3–4 (dorm phone call) |

Each NPC has a `short_intro` in the registry (≤20 words) used for first-encounter body prepends — see *Auto-Introduction* below.

---

## How Relationship State Changes

### Mechanism: Relationship Events

Choices in storylets emit `RelationshipEvent` objects — each event has an `npc_id`, a `type`, and an optional `magnitude` (defaults to 1).

The engine calls `applyRelationshipEvents()` (`src/lib/relationships.ts`), which:
1. Looks up (or creates) the current `RelationshipState` for the NPC
2. Applies `relationship` delta (1–10 scale) based on event type × magnitude
3. Applies `trust`, `reliability`, and `emotionalLoad` micro-deltas from `eventToMemoryDeltas()`
4. Flips `met`, `knows_name`, `knows_face` booleans as appropriate
5. Returns the updated state and a `RelationshipLogEntry` for auditing

### Event Types and Their Deltas

| Event | `relationship` Δ | `trust` Δ | `reliability` Δ | `emotionalLoad` Δ | Side effects |
|---|---|---|---|---|---|
| `INTRODUCED_SELF` | +1 | +1 | 0 | 0 | Sets `met`, `knows_name`, `knows_face` |
| `WOKE_IN_SAME_ROOM` | 0 | 0 | 0 | 0 | Sets `met`, `knows_face`, role_tag=roommate |
| `SHARED_MEAL` | +1 | +0.5 | +0.5 | 0 | Sets `met`, `knows_face` |
| `SMALL_KINDNESS` | +1 | +0.5 | +0.5 | 0 | — |
| `REPAIR_ATTEMPT` | +1 | 0 | +1 | 0 | — |
| `SHOWED_UP` | +1 | 0 | +1 | 0 | Sets `met`, `knows_face` |
| `CONFIDED_IN` | +1 | +1 | 0 | +1 | — |
| `OVERHEARD_NAME` | 0 | 0 | 0 | 0 | Sets `knows_name` |
| `NOTICED_FACE` | 0 | 0 | 0 | 0 | Sets `knows_face` |
| `WENT_MISSING` | −1 | 0 | −1 | 0 | — |
| `DEFERRED_TENSION` | 0 | 0 | −0.5 | 0 | No relationship delta — records a pattern |
| `AWKWARD_MOMENT` | −1 | −0.5 | 0 | 0 | — |
| `CONFLICT_LOW` | −1 | −1 | 0 | 0 | — |
| `DISRESPECT` | −2 | −2 | −1 | 0 | — |
| `DISMISSED` | −2 | −2 | 0 | 0 | — |
| `CONFLICT_HIGH` | −3 | −2 | −1 | 0 | — |

All deltas are multiplied by `magnitude` (default 1). All numeric fields are clamped after application.

---

## How Storylets Trigger Relationship Changes

There are three ways a choice can affect NPC relationship state:

### 1. `events_emitted` (preferred, explicit)

The most direct method. Attach an array of relationship events to a choice:

```json
{
  "id": "introduce_yourself",
  "label": "Introduce yourself properly",
  "events_emitted": [
    { "npc_id": "npc_floor_miguel", "type": "INTRODUCED_SELF", "magnitude": 1 }
  ]
}
```

The engine calls `applyRelationshipEvents()` with these events after the choice is resolved.

### 2. `relational_effects` (legacy / arc-style)

A shorthand map of NPC id → dimension → numeric delta, used in older arc steps and some narrative storylets:

```json
{
  "id": "help_with_notes",
  "label": "Lend her your notes",
  "relational_effects": {
    "npc_studious_priya": { "trust": 1, "reliability": 1 }
  }
}
```

The engine converts these via `mapLegacyRelationalEffects()`, which maps positive `trust` deltas to `SMALL_KINDNESS` events and negative to `AWKWARD_MOMENT` events.

### 3. `set_npc_memory` (legacy / flag-style)

Sets boolean knowledge flags directly on an NPC, used to mark introductions in older content:

```json
{
  "id": "say_his_name",
  "label": "Use his name when you leave",
  "set_npc_memory": {
    "npc_floor_miguel": { "met": true, "knows_name": true }
  }
}
```

Converted via `mapLegacyNpcKnowledge()` into `OVERHEARD_NAME` / `NOTICED_FACE` / `INTRODUCED_SELF` events.

---

## How NPC State Gates Storylets

### Gate 1: `introduces_npc` — Auto-Introduction

On a `Storylet`, not a choice:

```json
{
  "slug": "hall_phone_ring",
  "introduces_npc": ["npc_floor_miguel"],
  "body": "The phone at the end of the hall rings..."
}
```

**What happens:**
- If `npc_floor_miguel.met === false`, `getDisplayBody()` prepends their `short_intro` as a parenthetical before the body: `"(Miguel Reyes, room 214 — from San Antonio, first on the floor to learn everyone's name.)\n\n..."`)
- After any choice is taken on this storylet, all NPCs in `introduces_npc` are automatically marked `met = true` (the engine handles this — no need to add `set_npc_memory` separately)
- Only the first unmet NPC in the list generates a prefix per encounter

### Gate 2: `requires_npc_met` — Storylet Eligibility

On a `Storylet.requirements` object:

```json
{
  "requirements": {
    "requires_npc_met": ["npc_floor_miguel"]
  }
}
```

This storylet is only eligible to be drawn if every NPC in the list has `met === true`. Evaluated by `matchesRequirement()` in `src/core/storylets/reactionRequirements.ts`.

### Gate 3: `requires_npc_known` — Name Awareness Gate

```json
{
  "requirements": {
    "requires_npc_known": ["npc_prof_marsh"]
  }
}
```

Requires `knows_name === true` for each listed NPC. Can be combined with `requires_npc_met` using `all`/`any`/`not` composition.

### Gate 4: `requires_resource` / `condition` on Choices

Relationship values can be read via `condition` path expressions to gate individual choices:

```json
{
  "id": "confide_back",
  "label": "Tell her something real",
  "condition": {
    "path": "relationships.npc_roommate_dana.trust",
    "equals": 2
  }
}
```

### Gate 5: Name Rendering — `renderNpcName`

Anywhere a storylet body references an NPC by name, the engine calls `renderNpcName(npcId, relationships, fallback)`. If `knows_name === false`, the fallback string is shown instead (e.g. "the guy from your floor" instead of "Miguel"). This means name reveals are a natural consequence of reaching `INTRODUCED_SELF` or `OVERHEARD_NAME` events.

---

## Relationship Thresholds and Their Effects

### `trust` (−3 to +3)

| Value | Effect |
|---|---|
| +2 or above | NPC offers extended dialogue; confides something; certain depth storylines unlock |
| +1 | Normal positive relationship |
| 0 | Neutral default |
| −1 | Cooler tone; shorter responses; less available |
| −2 or below | NPC pulls back; some storylines become unavailable |

### `reliability` (−3 to +3)

| Value | Effect |
|---|---|
| +2 | NPC asks the player for something important |
| 0 | Normal |
| −2 | NPC stops inviting player; stops assuming they'll show |

### `emotionalLoad` (0–3)

| Value | Effect |
|---|---|
| 0–1 | Normal |
| 2 | NPC is leaning on player; some choices cost more energy |
| 3 | NPC crisis storyline becomes available (or unavoidable) |

---

## `RelationshipEvent` Type

Defined in `src/lib/relationships.ts`. Used in choice fields and emitted by the engine.

| Field | Type | Description |
|---|---|---|
| `npc_id` | `string` | Key of the NPC to affect (e.g. `npc_floor_miguel`). |
| `type` | `RelationshipEventType` | One of the 16 canonical event types (see table above). |
| `magnitude` | `number` (optional) | Scales all deltas for this event. Default 1. A value of 2 doubles the effect. |

---

## `RelationshipLogEntry` Type

Produced by `applyRelationshipEvents()`. Not persisted to DB (used for in-session debugging and server-side logging).

| Field | Description |
|---|---|
| `npc_id` | Which NPC was affected. |
| `type` | The event that fired. |
| `before` | Snapshot of `RelationshipState` before the event. |
| `after` | Snapshot of `RelationshipState` after the event. |
| `delta` | Specific changes: `relationship`, `met`, `knows_name`, `knows_face`. |
| `source` | `{ storylet_slug, choice_id }` — which choice triggered this change. |

---

## Composing NPC Requirements

`matchesRequirement()` supports logical composition for complex gates:

```json
{
  "requirements": {
    "all": [
      { "requires_npc_met": ["npc_floor_miguel"] },
      { "not": { "requires_npc_met": ["npc_ambiguous_jordan"] } }
    ]
  }
}
```

Supported operators: `all` (every child must pass), `any` (at least one child must pass), `not` (inverts a child), `path`+`equals` (arbitrary path check into player state).

---

## File Locations

| File | Purpose |
|---|---|
| `src/lib/relationships.ts` | Core type definitions, event→delta map, `applyRelationshipEvents()`, `renderNpcName()`, migration helpers |
| `src/domain/npcs/registry.ts` | `NPC_REGISTRY` with `short_intro` strings; `getDisplayBody()` for auto-introduction prepend |
| `src/core/storylets/reactionRequirements.ts` | `matchesRequirement()` — evaluates `requires_npc_met`, `requires_npc_known`, and composition operators |
| `src/types/daily.ts` | `DailyState` — contains `relationships` and `npc_memory` JSONB columns |
| `src/types/storylets.ts` | `StoryletChoice` fields: `events_emitted`, `relational_effects`, `set_npc_memory`, `introduces_npc` (on `Storylet`) |
| `docs/NPC_SYSTEM.md` | Narrative design bible: NPC personalities, what each character notices, and storylines they anchor |
