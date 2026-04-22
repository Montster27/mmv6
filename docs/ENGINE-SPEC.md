# MMV Storylet Engine — Precise Specification

> Written from source code, not assumptions.
> Files: `src/core/engine/dailyLoop.ts`, `src/core/tracks/selectTrackStorylets.ts`, `src/app/api/tracks/resolve/route.ts`

---

## 1. How a Storylet Gets Served: The Exact Flow

### Step 1 — Player opens `/play`

The client calls `getOrCreateDailyRun(userId, today)`.

### Step 2 — Track storylet scheduler runs

```
1. Load all tracks WHERE key IN (roommate, academic, money, belonging, opportunity, home)
       AND is_enabled = true

2. Load all storylets WHERE track_id IN (those track IDs)
       AND order_index ASC
   (is_active is NOT filtered here — all storylets for the track are loaded)

3. Load track_progress WHERE user_id = ? AND track_id IN (those track IDs)

4. For each track that has storylets but NO progress row:
   → create progress row via buildInitialTrackProgress()
     - finds lowest order_index storylet for that track
     - sets current_storylet_key = that storylet's storylet_key
     - sets storylet_due_day = today (startedDay) + that storylet's due_offset_days

5. Call selectTrackStorylets() → returns up to 2 DueStorylets

6. Format results as TrackStorylet[] and return in DailyRun
```

### Step 3 — `selectTrackStorylets()` filters

For each progress row:

```
1. Skip if progress.state != "ACTIVE"
2. Skip if track is not found or is_enabled = false
3. Override path: if progress.next_key_override is set and points to a non-resolved
   storylet, serve that one (subject to due-window + segment). This preserves
   explicit `next_key` / `default_next_key` chains. A stale override (pointing to
   an already-resolved storylet) is ignored and the pool scan runs instead.
4. Pool scan: for every storylet on the track, keep it iff:
   → not in progress.resolved_storylet_keys
   → is_active = true
   → storylet_key not in precludedKeys (daily_states.preclusion_gates)
   → started_day + due_offset_days <= dayIndex <= that + expires_after_days
   → meetsRequirements(storylet, resolvedChoices, trainedSkills, flags) (see §2)
   → passesSegmentFilter (see below)
   Pick the single candidate with the earliest expiry (most urgent).
5. Segment filter:
   → if storylet.is_conflict AND hoursRemaining < 4: always surface (bypasses segment)
   → else if currentSegment is set AND storylet.segment is set:
       → skip if storylet.segment != currentSegment
   → if storylet.segment is NULL: always passes segment filter
6. Collect the one best candidate per track into `due[]`.
Sort `due[]` by earliest expiresOnDay. Return first `maxStorylets` (default 2).
```

### Step 4 — Client renders

The `DailyRun` includes `trackStorylets: TrackStorylet[]`. If any exist and the day is not already completed, stage is forced to `"storylet_1"` so the player sees them.

---

## 2. Field-by-Field: What the Engine Actually Does

### `next_key` (on a choice object)

**Read by:** `POST /api/tracks/resolve`, step 6.

When the player picks a choice, the resolve route checks `chosenOption.next_key` first. If it's a string, that becomes the key for the next storylet to advance to.

```typescript
const nextKey = typeof chosenOption.next_key === "string"
  ? chosenOption.next_key
  : (typeof storyletRow.default_next_key === "string"
      ? storyletRow.default_next_key
      : null);
```

**Critical:** The lookup is **track-scoped**:
```sql
SELECT storylet_key, due_offset_days
FROM storylets
WHERE track_id = progressRow.track_id   ← same track only
  AND storylet_key = nextKey
```
A `next_key` pointing to a storylet on a different track will not resolve. The engine falls back to `nextDueDay = day_index + 1` and sets `current_storylet_key` to the unresolvable key — creating a broken pointer that silently kills the track.

---

### `default_next_key` (on the storylet)

**Read by:** `POST /api/tracks/resolve`, step 6 (fallback when no choice has `next_key`).

Used only if no choice in the terminal set has a `next_key` field. Same track-scoped lookup applies.

---

### `due_offset_days`

**Read by:** Two places.

1. **`buildInitialTrackProgress()`** — when creating the first progress row for a track:
   ```
   storylet_due_day = startedDay + first_storylet.due_offset_days
   ```

2. **`POST /api/tracks/resolve`** — when advancing to the next storylet:
   ```
   nextDueDay = progressRow.started_day + nextStorylet.due_offset_days
   ```
   Note: computed from **started_day**, not current day. So `due_offset_days: 3` always means "Day 3 of the player's run," regardless of when the choice was made.

   **Fallback:** If the next storylet can't be found (broken pointer), `nextDueDay = day_index + 1` (tomorrow).

---

### `order_index`

**Read by:** `buildInitialTrackProgress()` only, to find the first storylet in each track.

```typescript
const trackStorylets = storylets
  .filter(s => s.track_id === track.id)
  .sort((a, b) => a.order_index - b.order_index);
const first = trackStorylets[0];
```

After that: **never used again**. The chain advances via `next_key`, not `order_index`. Two storylets on the same track could have the same `order_index` and the engine doesn't care — it only ever looks up by `storylet_key`.

---

### `segment` (morning / afternoon / evening)

**Read by:** `selectTrackStorylets()`, line 77–78.

```typescript
if (currentSegment && storylet.segment) {
  if (storylet.segment !== currentSegment) continue;
}
```

**Behaviour:**
- `segment: null` → always passes (no gating)
- `segment: "morning"` AND `currentSegment = "morning"` → passes
- `segment: "morning"` AND `currentSegment = "afternoon"` → blocked until segment changes
- `currentSegment` comes from `player_day_state.current_segment` (read by dailyLoop)

**Conflict exception:** Storylets with `is_conflict = true` bypass segment gating entirely when `hoursRemaining < 4`.

---

### `track_id` + `storylet_key` (= `step_key`)

**Read by:** Every query. These two fields together are how the engine locates a specific storylet.

The lookup key is always: `"${track_id}:${storylet_key}"`.

`step_key` and `storylet_key` are two DB columns that should be kept in sync — the engine reads `storylet_key`. The legacy column `step_key` is not directly referenced in the engine code but may be used by the Content Studio graph view.

---

### `tags`

**Read by:** The track engine does **not read tags**. They are not used in `selectTrackStorylets()`, `buildInitialTrackProgress()`, or `/api/tracks/resolve`.

Tags like `game_entry`, `arc_one`, `day1` are informational metadata only. `game_entry` has no special engine behavior — it doesn't gate or trigger anything. Tags only matter in the legacy `selectStorylets()` system for non-track storylets.

---

### `weight`

**Read by:** Not read by the track engine. Only used by legacy `selectStorylets()` for probability scoring among non-track storylets.

---

### `requirements`

**Read by:** `selectTrackStorylets.ts` → `meetsRequirements()`. Applied during the pool scan (step 4 above). A storylet is only eligible if its `requirements` object is empty OR every requirement it lists is satisfied.

Supported keys:

| Key | Type | Meaning |
|-----|------|---------|
| `requires_choice` | string | Player must have previously picked a choice with this `option_key` on the **same track**. Sourced from `choice_log` where `event_type='STORYLET_RESOLVED'`. |
| `requires_flag` | string | Player must have this flag set via `sets_flag` on a prior choice. Sourced from `choice_log` where `event_type='FLAG_SET'`. **Cross-track via global union** — see below. |
| `requires_skill` | `{skill_id, min_level?}` | Player must have `skill_id` in `player_skills` with `status='trained'`. `min_level` is currently ignored (binary gate). |

Unknown keys pass (forward-compatible).

**`requires_flag` is cross-track.** The engine builds two flag collections from `choice_log` FLAG_SET events:
- `flagsByTrack`: per-track set, for any future track-scoped check.
- `globalFlags`: the union across all tracks.

At pool-scan time the per-track set is unioned with `globalFlags` before calling `meetsRequirements`. This means a `requires_flag: "tuesday_terminal"` on an opportunity-track storylet (`the_post`) succeeds when the flag was set by a belonging-track storylet (`tuesday_commitment` → `tuesday_decided_terminal`).

*Change history:* Prior to 2026-04-22 `requires_flag` was strict per-track and cross-track gates silently failed. Fixed in `dailyLoop.ts` (removes `.in("track_id", trackIds)` on the FLAG_SET query and builds `globalFlags`) + `selectTrackStorylets.ts` (unions `globalFlags` into `trackFlags` pre-evaluation). Unblocked `the_post` and `tuesday_night_terminal`.

---

### `expires_after_days`

**Read by:** `selectTrackStorylets()`, line 69.

```typescript
const expiresOnDay = dueDay + storylet.expires_after_days;
if (dayIndex > expiresOnDay) continue;
```

- `expires_after_days: 0` → expires on the same day it's due (only shows day N, gone on day N+1)
- `expires_after_days: 7` → window of 8 days (dueDay through dueDay+7 inclusive)
- `expires_after_days: null` → loaded as `0` by dailyLoop (`r.expires_after_days ?? 0`)

**When a storylet expires unresolved:** The engine silently skips it. The track_progress still points to that storylet_key — it won't advance automatically. The track is effectively stuck unless there's a separate mechanism to advance past expired storylets (there isn't one in the current code).

---

## 3. Day Transitions

### There is no automatic day advancement.

Day transitions work entirely through the resolve-and-advance mechanism:

1. Player resolves a storylet on Day N
2. Resolve route looks up the next storylet and reads its `due_offset_days`
3. Sets `storylet_due_day = progressRow.started_day + next_storylet.due_offset_days`
4. Next day, engine checks `storylet_due_day <= dayIndex`
5. If yes, the new storylet surfaces

**If `due_offset_days` on the next storylet = 0:** it's due on `started_day + 0 = started_day`. If the player is past that day, it shows immediately (same day as the choice that advanced to it).

**If `due_offset_days` = 1:** shows on Day 1 regardless of what day the player actually resolved the previous storylet (because it's `started_day + 1`, not `current_day + 1`).

**Nothing triggers Day 2 content automatically.** Content for Day 2 only appears if:
- A Day 1 storylet was resolved with a `next_key` that chains to a Day 2 storylet
- AND that Day 2 storylet has `due_offset_days: 2` (or similar)
- AND the player is on Day 2 or later

---

## 4. The `maxStorylets = 2` Limit

```typescript
export function selectTrackStorylets({
  maxStorylets = 2,
  ...
}): DueStorylet[] {
  ...
  return due.slice(0, maxStorylets);
}
```

**2 total storylets across all tracks.** Not per-track, not per-segment — 2 total.

This is the cap on what shows at once. If 4 tracks all have due storylets on the same day and segment, only the 2 most urgent (earliest expiry) appear. The other 2 are suppressed until the first 2 are resolved (at which point the next daily run call will surface the next candidates).

The dailyLoop calls `selectTrackStorylets()` without overriding `maxStorylets`, so 2 is the live value.

---

## 5. Track Completion and Restart

**Once COMPLETED, a track is dead.**

When a choice resolves with no `next_key` and no `default_next_key`:
```typescript
await supabase.from("track_progress").update({
  state: "COMPLETED",
  ...
})
```

`selectTrackStorylets()` filters `if (prog.state !== "ACTIVE") continue;` — so COMPLETED tracks never surface again. There is no restart mechanism in the current code.

---

## 6. `getOrCreateDailyRun()` and `selectTrackStorylets()`: Interaction

```
getOrCreateDailyRun()
  ├── Checks chapter one mode flag
  ├── Loads tracks + storylets + progress
  ├── Creates missing progress rows (buildInitialTrackProgress)
  ├── Calls selectTrackStorylets(dayIndex, progress, storylets, segment, hours)
  │     └── Returns up to 2 DueStorylet objects
  └── Packages them as TrackStorylet[] in the DailyRun response
```

`getOrCreateDailyRun()` is called on every `/play` page load (and on refresh). `selectTrackStorylets()` is a pure function — no DB writes, no side effects. The actual state changes only happen via `POST /api/tracks/resolve`.

---

## 7. Common Failure Modes

| Symptom | Cause |
|---------|-------|
| Storylet never appears | `current_storylet_key` doesn't match any `storylet_key` in the track — broken pointer |
| Storylet appears wrong day | `due_offset_days` is relative to `started_day`, not current day |
| Storylet blocked by segment | `storylet.segment` set but `currentSegment` doesn't match |
| Track dies silently | `next_key` or `default_next_key` references a storylet on a different track — engine falls back to `day_index + 1` and sets a key that won't resolve |
| Track marked COMPLETED prematurely | Both `next_key` (on choice) and `default_next_key` (on storylet) are null |
| Only 1 of 2 storylets appears | Both due on same day — sorted by expiry, only top 2 returned |
| Storylet shows in wrong segment | `storylet.segment` is `null` — null always passes the segment filter |

---

## 8. The Rule for New Storylets

**A storylet is unreachable unless a prior storylet on the same track explicitly names it as `next_key`.**

There is no queue scanning, no order_index-based sequencing after initialization, no day-based auto-discovery. Every storylet after the first in a track must be chained via `next_key` on a choice or `default_next_key` on the prior storylet.

The only exception: the very first storylet in a track, set by `buildInitialTrackProgress()` using `order_index`. After that, `order_index` is irrelevant.

---

## 9. Conversational Node Walk

A storylet with a non-null `nodes` column (jsonb array of `DialogueNode`) renders as an interactive dialogue tree before terminal choices.

### Rendering flow

```
1. If storylet.nodes IS NULL → render as flat (body + choices). No change.

2. Else:
   a. Show storylet.body as preamble (1–3 sentences).
   b. Start at nodes[0].
   c. Render node: show text. If node has speaker (NPC id), render as
      italicized quoted dialogue with small attribution line beneath.
   d. If node has micro_choices → show as inline options.
      On selection:
        - apply sets_flag to walk-local flag set (in-memory only)
        - apply set_npc_memory / relational_effect to persistent state (DB)
        - navigate to micro_choice.next
   e. If node has next (no micro_choices) → show "Continue" → node.next.
   f. Repeat until next == "choices" or "exit".

3. When next == "choices":
   a. Filter terminal choices:
      - hide if requires_flag not in walk flags
      - hide if excludes_flag is in walk flags
      - fallback: if filtering leaves zero choices, show all
   b. Render remaining terminal choices as usual.

4. When next == "exit":
   a. Storylet ends. Resolve via default_next_key. No terminal choice logged.
```

### Invariants

- Node walk emits NO `choice_log` rows. Only terminal choices log.
- Node walk cannot write `next_key_override` or `sets_track_state`. Terminal choices retain sole authority over track progression.
- Walk flags are in-memory only. They do not hit the DB.
- NPC memory and relational effects from micro-choices commit immediately (not deferred).
- `requires_flag` / `excludes_flag` on a **`StoryletChoice`** (terminal choice) are walk-local — filtered by `DialogueNodeView` against the in-memory walk flag set. They are NOT the same as the storylet-level `requires_flag` gate (which lives in `storylet.requirements.requires_flag` and goes through `meetsRequirements` during pool scan — see §2 `requirements`).
- To persist a walk flag so a downstream storylet can gate on it, the terminal choice must carry its own `sets_flag: ["x"]`. Walk flags set inside micro-choices do NOT survive the scene.
  - *Pattern:* `tuesday_commitment` ends with four walk-flag-gated terminals (`requires_flag` on the choice, `sets_flag` mirroring it). The walk filter selects the one matching the commitment; that terminal's `sets_flag` writes a FLAG_SET row that downstream storylets read via `meetsRequirements`.
