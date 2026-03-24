# Track + Storylet Content Model

> Canonical reference for the two-entity content system used by MMV.

---

## Overview

All narrative content in MMV is built from two entities:

| Entity | What It Is |
|--------|-----------|
| **Track** | A named parallel narrative thread containing a DAG of storylets. Multiple tracks run concurrently. Each has entry points, branching paths, and multiple exit points. |
| **Storylet** | The universal content unit. Can belong to a track (node in its DAG) or float standalone. |

There are no other structural concepts. "Stream," "arc," and "beat" are retired terms.

---

## Track

A track is a container for a group of storylets that form a narrative progression. Tracks run in parallel — the player advances through multiple tracks simultaneously, choosing how to spend limited time.

### Schema (`tracks` table)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Internal ID |
| `key` | text UNIQUE | Short identifier: `"roommate"`, `"academic"`, `"money"` |
| `title` | text | Human-readable: `"The Roommate"`, `"Academic Footing"` |
| `description` | text | Brief description for Studio/debug |
| `category` | text | Grouping: `"life_stream"`, `"side_quest"`, `"frame"` |
| `chapter` | text | Scope: `"one"`, `"two"`, etc. |
| `is_enabled` | boolean | Whether this track is active |
| `tags` | text[] | Freeform tags for filtering |

### Track Keys (Chapter One)

| Key | Title | Category |
|-----|-------|----------|
| `roommate` | The Roommate | life_stream |
| `academic` | Academic Footing | life_stream |
| `money` | Money Reality | life_stream |
| `belonging` | Finding Your People | life_stream |
| `opportunity` | First Opportunity | life_stream |
| `home` | Something From Home | life_stream |

### Track Progress (`track_progress` table)

Each player has one progress row per track they've entered.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Internal ID |
| `user_id` | uuid FK | Player |
| `track_id` | uuid FK | Which track |
| `current_storylet_key` | text | Position in DAG (which storylet they're on) |
| `storylet_due_day` | integer | Day this storylet becomes available |
| `state` | text | `active` · `completed` · `failed` · `abandoned` |
| `track_state` | text | Narrative FSM state (e.g., `"genuine_connection"`) |
| `started_day` | integer | Day the player entered this track |
| `defer_count` | integer | Times the current storylet was deferred |
| `branch_key` | text | Which path branch the player is on |

### Track States (Chapter One)

Each track has its own set of valid narrative states:

**Roommate:** `neutral_coexistence` · `genuine_connection` · `surface_tension` · `open_conflict` · `avoidance_pattern`

**Academic:** `false_confidence` · `quiet_doubt` · `active_engagement` · `avoidance_spiral` · `found_a_thread`

**Money:** `not_yet_felt` · `background_hum` · `friction_visible` · `active_stress` · `resolved`

**Belonging:** `open_scanning` · `first_anchor` · `performing_fit` · `genuine_match` · `withdrawal`

**Opportunity:** `undiscovered` · `noticed` · `considering` · `pursuing` · `committed` · `expired`

**Home:** `clean_break` · `background_warmth` · `guilt_current` · `active_pull` · `identity_rupture`

---

## Storylet

A storylet is a content unit: narrative text + choices. It can either belong to a track (positioned in that track's DAG) or exist standalone.

### Schema (`storylets` table)

Core fields (all storylets):

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Internal ID |
| `slug` | text UNIQUE | URL-safe identifier |
| `title` | text | Heading |
| `body` | text | Narrative text |
| `choices` | jsonb | Array of `StoryletChoice` |
| `is_active` | boolean | Whether this storylet can appear |
| `tags` | text[] | Freeform tags |
| `introduces_npc` | text[] | NPC IDs introduced by this storylet |

Track membership fields (null for standalone):

| Column | Type | Description |
|--------|------|-------------|
| `track_id` | uuid FK | Which track this belongs to (null = standalone) |
| `storylet_key` | text | Unique key within the track |
| `order_index` | integer | Display/creation order |
| `due_offset_days` | integer | Days after track start this becomes due |
| `expires_after_days` | integer | Window for completion after due day |
| `default_next_key` | text | Default next storylet_key if choice doesn't specify |

Segment/time fields:

| Column | Type | Description |
|--------|------|-------------|
| `segment` | text | `morning` · `afternoon` · `evening` · `night` · null (any) |
| `time_cost_hours` | integer | Hours deducted from daily budget (default 1) |
| `is_conflict` | boolean | Surfaces when time budget is tight |

### DAG Structure

The graph edges are defined by **choices**. Each choice can specify `next_key` to advance to a different storylet within the same track. Multiple choices → multiple paths. No `next_key` → exit point.

```
Track: "roommate"

  [move_in] ──choice A──→ [lend_cassette] ──→ [cassette_returned]  EXIT A
      │
      └──choice B──→ [decline_lend] ──→ [tension_rises] ──┬──→ EXIT B
                                                           └──→ EXIT C
```

### Choice Schema

```typescript
type StoryletChoice = {
  id: string;
  label: string;

  // Outcome
  outcome?: StoryletOutcome;          // deterministic
  outcomes?: StoryletOutcomeOption[];  // weighted/probabilistic

  // Navigation within track
  next_key?: string;                  // next storylet_key in this track
  targetStoryletId?: string;          // jump to any storylet by ID

  // Costs & rewards
  time_cost?: number;
  energy_cost?: number;
  costs?: { resources?: Record<string, number> };
  rewards?: { resources?: Record<string, number> };

  // Track state effect
  sets_track_state?: { state: string };  // sets track_progress.track_state

  // Mini-game trigger
  mini_game?: { type: MiniGameType; config?: Record<string, unknown> };

  // ... other fields (identity_tags, precludes, events_emitted, etc.)
};
```

---

## How Content Flows

### Standalone Storylets
1. Storylet exists with `track_id = null`
2. `selectStorylets()` draws from weighted pool each day
3. Player sees it, makes a choice
4. Outcome applies resource deltas

### Track Storylets
1. Storylet exists with `track_id` set, `storylet_key`, `order_index`, etc.
2. `track_progress` row tracks player's current position
3. `selectTrackStorylets()` checks due windows daily
4. Player sees storylet, makes choice
5. Choice's `next_key` advances the DAG position
6. Choice's `sets_track_state` updates narrative state
7. No `next_key` → track completes

### Track Initialization
On Chapter One day 1, a progress row is created for each enabled track. The player starts at the first storylet (lowest `order_index`).

### Selection Algorithm
Each day:
1. Load all tracks with `is_enabled = true`
2. Load all storylets with `track_id` in those tracks
3. Load/create `track_progress` rows for this player
4. For each active progress row, check if current storylet is due:
   - `storylet_due_day <= dayIndex <= storylet_due_day + expires_after_days`
5. Apply segment filter (conflict storylets bypass when time < 4 hours)
6. Sort by earliest expiry, return up to 2

---

## Terminology Migration

| Retired Term | Replacement |
|-------------|-------------|
| Stream | Track (with `category: "life_stream"`) |
| Arc | Track |
| Beat | Storylet (in a track) |
| `arc_definitions` | `tracks` |
| `arc_instances` | `track_progress` |
| `arc_id` | `track_id` |
| `step_key` | `storylet_key` |
| `ArcBeat` | `TrackStorylet` |
| `StreamId` | `TrackKey` |
| `sets_stream_state` | `sets_track_state` |
