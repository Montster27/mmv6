# Engine Queue Plan: Chain-Based to Pool-Based Storylet Selection

> Goal: Tracks serve storylets based on day, segment, and conditions — not just
> explicit `next_key` chains. Tracks stay alive as long as unresolved future
> content exists, without requiring every storylet to be manually chained.

---

## 1. DB Schema Changes

### 1a. Add `resolved_storylet_keys` to `track_progress`

```sql
ALTER TABLE track_progress
  ADD COLUMN resolved_storylet_keys text[] NOT NULL DEFAULT '{}';
```

**Why a column instead of a join table:** The resolved set per track per player
is small (tens of keys, not thousands). A `text[]` column avoids join overhead
in the hot path (`selectTrackStorylets` runs on every `/play` load). It's
appended to on resolve and read on selection — both simple array operations.

A join table (`resolved_storylets(user_id, track_id, storylet_key, resolved_day)`)
would be cleaner for analytics queries but adds a query per track on every page
load. Start with the column; migrate to a join table later if analytics needs grow.

### 1b. Add `requirements` support (already exists on storylets table)

The `requirements` column already exists as `jsonb` on the `storylets` table but
is **not read** by the track engine (ENGINE-SPEC.md, section on `requirements`).
No schema change needed — just need to start reading it.

### 1c. Add `next_key_override` to `track_progress`

```sql
ALTER TABLE track_progress
  ADD COLUMN next_key_override text DEFAULT NULL;
```

When a resolved choice has `next_key`, store it here. On the next selection pass,
serve this storylet first (bypassing pool scan). After it resolves, clear the
field and resume pool scanning. This preserves sequential chains.

### 1d. No changes to `storylets` table

All needed fields already exist: `due_offset_days`, `expires_after_days`,
`segment`, `is_active`, `requirements`, `track_id`, `storylet_key`.

### Migration file

One migration: `YYYYMMDDNNNNNN_add_queue_columns.sql`

```sql
ALTER TABLE track_progress
  ADD COLUMN IF NOT EXISTS resolved_storylet_keys text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_key_override text DEFAULT NULL;
```

---

## 2. Revised `selectTrackStorylets()` Logic

Current flow (chain-based):
```
for each progress row:
  look up ONE storylet by current_storylet_key
  check due window + segment
  add to candidates
```

New flow (pool-based):

```
for each progress row:
  if prog.state != "ACTIVE" → skip
  if track not found or disabled → skip

  // Priority override: if next_key_override is set, serve that storylet
  if prog.next_key_override:
    look up storylet by next_key_override on this track
    if found AND in due window AND segment matches:
      add to candidates, continue to next track
    // if not yet due, don't fall through to pool — wait for it
    if found AND dayIndex < dueDay:
      continue (skip this track for now)
    // if expired or missing, clear override and fall through to pool

  // Pool scan: find all eligible storylets on this track
  for each storylet on this track:
    skip if storylet.storylet_key IN prog.resolved_storylet_keys
    skip if storylet.is_active = false
    dueDay = prog.started_day + storylet.due_offset_days
    expiresOnDay = dueDay + storylet.expires_after_days
    skip if dayIndex < dueDay (not yet due)
    skip if dayIndex > expiresOnDay (expired)
    segment filter (same as current — null always passes, conflict bypass)
    requirements filter (new — see section 4)
    add to candidates

sort candidates by earliest expiresOnDay
return first maxStorylets (2)
```

**Key differences from current:**
- No longer reads `current_storylet_key` as the sole pointer (except via override)
- Scans ALL storylets on the track, filtering by resolved set
- `current_storylet_key` is still updated for backward compat but is only
  authoritative when `next_key_override` is set

### New function signature

```typescript
type SelectTrackStoryletsArgs = {
  dayIndex: number;
  progress: TrackProgress[];        // now includes resolved_storylet_keys, next_key_override
  storylets: TrackStoryletRow[];
  tracks: Track[];
  maxStorylets?: number;
  currentSegment?: string;
  hoursRemaining?: number;
};
```

`TrackProgress` type gains:
```typescript
resolved_storylet_keys: string[];
next_key_override: string | null;
```

### Pre-index optimization

Build a `Map<track_id, TrackStoryletRow[]>` once, outside the loop, so the pool
scan doesn't re-filter the full storylet array for every progress row.

---

## 3. Revised Resolve Route Logic

Current flow:
```
1. Load progress + storylet
2. Find chosen option
3. Apply resources, track state, money
4. Compute nextKey from choice.next_key || storylet.default_next_key
5. If nextKey: update current_storylet_key + storylet_due_day
6. If no nextKey: mark COMPLETED
7. Log to choice_log
```

New flow — changes at steps 4–6:

```
4. Record current storylet as resolved:
   append current_storylet_key to resolved_storylet_keys array

5. Compute nextKey (same as before):
   choice.next_key || storylet.default_next_key || null

6a. If nextKey:
    - Set next_key_override = nextKey
    - Look up the next storylet to compute storylet_due_day
    - Update current_storylet_key = nextKey (backward compat)
    - Do NOT mark completed

6b. If no nextKey:
    - Set next_key_override = NULL
    - Check: are there ANY unresolved storylets on this track
      with due_offset_days > current day offset?
    - If yes: track stays ACTIVE, current_storylet_key = NULL (pool mode)
    - If no:  track → COMPLETED

7. Log to choice_log (unchanged)
```

### SQL for step 4 (append to resolved array)

```sql
UPDATE track_progress
SET resolved_storylet_keys = array_append(resolved_storylet_keys, $current_key)
WHERE id = $progress_id;
```

Or in the Supabase JS client, do a read-modify-write (read current array,
append, update). The array_append approach is safer for concurrency.

### SQL for step 6b (check for future content)

```sql
SELECT COUNT(*) as remaining
FROM storylets
WHERE track_id = $track_id
  AND is_active = true
  AND storylet_key != ALL($resolved_keys)
  AND due_offset_days > ($day_index - $started_day);
```

If `remaining > 0`, track stays ACTIVE. Otherwise COMPLETED.

---

## 4. Basic Requirements Gating

Read the `requirements` jsonb field on storylets during the pool scan.

### Supported requirement: `requires_choice`

```json
{
  "requires_choice": "go_to_party"
}
```

Meaning: this storylet only surfaces if a choice with `option_key = "go_to_party"`
was previously picked (exists in `choice_log` for this user and track).

### `requires_choice` is track-scoped

**Known limitation:** `requires_choice` only gates content within the same track.
A choice picked on the belonging track cannot gate a storylet on the academic track.
Cross-track gating (e.g., "show this academic beat only if you went to the party on
the belonging track") is a future extension. For now, design all flag-gated content
so the gating choice and the gated storylet live on the same track.

### Implementation in selectTrackStorylets

```typescript
function meetsRequirements(
  storylet: TrackStoryletRow,
  resolvedChoices: Set<string>   // option_keys from choice_log for this track
): boolean {
  const reqs = storylet.requirements as Record<string, unknown> | null;
  if (!reqs) return true;

  if (typeof reqs.requires_choice === "string") {
    return resolvedChoices.has(reqs.requires_choice);
  }

  return true; // unknown requirement types pass (forward compatible)
}
```

### Data source for `resolvedChoices`

Load from `choice_log` when building the daily run:

```sql
SELECT DISTINCT option_key
FROM choice_log
WHERE user_id = $user_id
  AND track_id = $track_id
  AND event_type = 'STORYLET_RESOLVED';
```

This is a new query added to `getOrCreateDailyRun()`. Cache per track per call.

### `choice_log.option_key` value format — verified

`choice_log.option_key` stores the `"id"` field from the storylet's choice JSON —
e.g., `"go_to_party"`, `"lean_cs"`, `"admin_before_lunch"`. Confirmed by tracing:

1. Client sends `option_key = choice.id` when submitting a resolve.
2. Resolve route matches: `c.id === option_key || c.option_key === option_key`.
3. Resolve route writes that exact string to `choice_log.option_key`.

So `requires_choice: "go_to_party"` in a storylet's requirements will correctly
match a `choice_log` row where `option_key = "go_to_party"`. No transform needed.

---

## 5. `next_key` as Priority Override

When a choice has `next_key`, that override is stored on `track_progress.next_key_override`.

**Lifecycle:**
1. Player resolves storylet, choice has `next_key: "lunch_floor"`
2. Resolve route sets `next_key_override = "lunch_floor"` on the progress row
3. Next `selectTrackStorylets()` call sees the override, serves `lunch_floor`
   directly (bypasses pool scan for this track)
4. When `lunch_floor` resolves:
   - If its choice also has `next_key` → new override, chain continues
   - If no `next_key` → clear override, resume pool scan

**Why a separate column instead of reusing `current_storylet_key`:** Clarity of
intent. `current_storylet_key` currently means "the one storylet this track can
serve." In pool mode, the track can serve any eligible storylet.
`next_key_override` explicitly means "serve this one next, then go back to pool."
Also allows `current_storylet_key` to remain as a "last resolved" audit field.

---

## 6. Changes to `buildInitialTrackProgress()`

Minimal changes:

```typescript
export function buildInitialTrackProgress(
  userId: string,
  tracks: Track[],
  storylets: TrackStoryletRow[],
  startedDay: number
) {
  // Same as before: find lowest order_index storylet per track
  // But now also initialize new fields:
  return {
    ...existingFields,
    resolved_storylet_keys: [],      // empty — nothing resolved yet
    next_key_override: firstStorylet.storylet_key,  // serve the first one as override
  };
}
```

Setting `next_key_override` to the first storylet ensures Day 0 behaves
identically to the chain system — the first storylet is served via override,
not discovered by pool scan. After it resolves, if it has `next_key`, the
chain continues. If not, pool scan kicks in.

---

## 7. Track Completion Logic

**Current:** Track completes when `next_key` is null on resolve.

**New:** Track completes when ALL of these are true:
1. `next_key_override` is null (no pending chain)
2. No unresolved storylets exist in the current or future due window

```typescript
// After resolve, if no next_key:
const futureCount = await countFutureUnresolved(trackId, resolvedKeys, dayOffset);
if (futureCount === 0) {
  // Mark COMPLETED
} else {
  // Stay ACTIVE, clear next_key_override, let pool scan find the next one
}
```

**Tracks stay ACTIVE through gaps.** If a track has content on Day 0 and Day 5
but nothing on Days 1–4, it stays ACTIVE through the gap. The pool scan simply
returns nothing for those days — no storylets surface, but the track isn't dead.

---

## 8. Backward Compatibility

### All existing Day 0–1 content must work identically

The existing chains use `next_key` and `default_next_key` throughout:

```
room_214 →(default)→ first_morning →(null)→ COMPLETED
dorm_hallmates →(choice)→ lunch_floor →(default)→ evening_choice →(default)→ hall_morning →(null)→ COMPLETED
admin_errand →(default)→ advisor_visit →(null)→ COMPLETED
```

With the new system:
- `buildInitialTrackProgress` sets `next_key_override = first storylet` → first storylet served (same as before)
- First resolve: `next_key` from choice or `default_next_key` → sets `next_key_override` → next storylet served via override (same as before)
- Final resolve: no `next_key` → check for future unresolved content → none exists → COMPLETED (same as before)

The chain path is never broken because `next_key_override` replicates the exact
current behavior when chains exist. Pool scan is only reached when no override is set.

### New unchained storylets work via pool

A new storylet added to the belonging track with `due_offset_days: 5` and no
`next_key` pointing to it would:
- Not be served on Days 0–4 (not yet due)
- Surface on Day 5+ via pool scan (if belonging track is still ACTIVE)
- Track stays ACTIVE because `countFutureUnresolved` sees it

---

## 9. Test Checklist

### Existing content still works (regression)

- [ ] **Roommate Day 0:** `room_214` surfaces on Day 0 morning. Resolve → `first_morning` surfaces on Day 1 morning. Resolve → track COMPLETED.
- [ ] **Belonging Day 0:** `dorm_hallmates` → `lunch_floor` → `evening_choice` → `hall_morning` chain works identically. All transitions via `next_key`/`default_next_key` preserved.
- [ ] **Academic Day 0–1:** `admin_errand` → `advisor_visit` chain works. COMPLETED after `advisor_visit` resolves.
- [ ] **maxStorylets = 2:** When multiple tracks have due storylets, only 2 returned, sorted by expiry.
- [ ] **Segment filtering:** Morning storylets don't surface in afternoon. Null segment always passes.
- [ ] **Conflict bypass:** `is_conflict = true` storylets bypass segment when `hoursRemaining < 4`.
- [ ] **Track activation:** `_arc_activated` on a choice still creates new progress rows correctly.
- [ ] **resolved_storylet_keys grows:** After resolving `room_214`, it appears in the array. After resolving `first_morning`, both appear.

### New pool-based behavior

- [ ] **Unchained storylet surfaces:** Add a test storylet to belonging track with `due_offset_days: 2`, no `next_key` pointing to it. After Day 0–1 chain completes and hall_morning resolves, track stays ACTIVE (because test storylet exists in future). On Day 2, test storylet surfaces via pool scan.
- [ ] **Already-resolved storylets don't resurface:** Resolve the test storylet. It appears in `resolved_storylet_keys`. It does not surface again on subsequent loads.
- [ ] **Track completes after all content resolved:** After resolving the Day 2 test storylet with no further content, track transitions to COMPLETED.
- [ ] **Track survives gaps:** Track with content on Day 0 and Day 5 stays ACTIVE on Days 1–4 with no storylets surfacing. Day 5 storylet appears.
- [ ] **next_key override takes priority:** If a chain choice has `next_key`, that storylet is served next even if other pool storylets are also eligible.
- [ ] **Override clears after resolve:** After override storylet resolves without its own `next_key`, pool scan resumes.
- [ ] **requires_choice gating:** Storylet with `requirements: { requires_choice: "go_to_party" }` only surfaces if `go_to_party` is in `choice_log` for that user+track. Does not surface if player picked `go_to_cards` instead.
- [ ] **Expired unchained storylets:** An unchained storylet with `due_offset_days: 1, expires_after_days: 0` does not surface on Day 2+. Track stays ACTIVE if other future content exists.
- [ ] **is_active = false excluded from pool:** Disabled storylets (`is_active = false`) never appear in pool scan results.

### Edge cases

- [ ] **Empty track (no storylets):** `buildInitialTrackProgress` still skips it. No crash.
- [ ] **All storylets expired unresolved:** Track with only expired content transitions to COMPLETED (no future content remains).
- [ ] **Concurrent tracks with pool + chain:** One track using chains (roommate) and another using pool (opportunity) both surface correctly in the same daily run.
- [ ] **Multiple pool candidates same segment:** Two unchained storylets on the same track, same day, same segment. Both are candidates; earliest-expiry wins. Second surfaces after first resolves.

---

## 10. Implementation Order

1. **Migration:** Add `resolved_storylet_keys` and `next_key_override` columns
2. **Types:** Update `TrackProgress` type with new fields
3. **selectTrackStorylets:** Rewrite to pool-based with override priority
4. **resolve route:** Add resolved tracking, override management, new completion logic
5. **buildInitialTrackProgress:** Set initial override to first storylet
6. **Requirements:** Add `meetsRequirements()` and `choice_log` query
7. **Test:** Run full checklist above
8. **Content:** Add first unchained test storylet to verify pool scan works

---

## 11. What This Does NOT Change

- **Storylet schema:** No new columns on `storylets`. `requirements` already exists.
- **Client rendering:** `TrackStorylet` display type unchanged. Client doesn't know chain vs pool.
- **choice_log:** Same schema, same writes.
- **daily_states / player_day_state:** Untouched.
- **Resource system:** Untouched.
- **maxStorylets cap:** Still 2. This plan doesn't change that.
- **Conflict system:** `is_conflict` bypass unchanged.

---

*Source: ENGINE-SPEC.md, CHAIN-MAP.md, selectTrackStorylets.ts, route.ts (resolve)*
