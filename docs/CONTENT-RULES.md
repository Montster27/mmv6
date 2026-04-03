# Content Placement Rules
> The one and only authority for how storylets are placed in the engine.
> Every migration must follow these rules. No exceptions.

---

## Rule 1: Two modes. Pick one per storylet. Never mix.

**CHAIN MODE:** The storylet is served because a prior storylet's `next_key` or `default_next_key` explicitly names it. Use chain mode when scenes MUST play in a fixed sequence (hallmates → lunch → evening).

**POOL MODE:** The storylet is served because it matches the current day, segment, and requirements. No storylet points to it. Use pool mode when scenes are independent or gated by prior choices (morning-after variants, optional encounters).

**The rule:** A storylet is either chained OR pooled. Never both. If a `default_next_key` or any choice `next_key` points to a storylet, that storylet is in chain mode — the pool will never reach it because the override takes priority. If you want the pool to serve a storylet, nothing can chain to it.

---

## Rule 2: Chain sequences use `next_key`. The last link has NO `default_next_key`.

A chain is a strict sequence on a single track:

```
storylet_A
  choice_1 → next_key: "storylet_B"
  choice_2 → next_key: "storylet_B"
  (all choices point to the same next, or default_next_key handles it)

storylet_B
  default_next_key: "storylet_C"

storylet_C
  default_next_key: NULL  ← END OF CHAIN. Pool takes over from here.
```

**The last storylet in any chain MUST have `default_next_key: NULL` and NO choice-level `next_key` values.** This clears the override and lets the pool scan find the next content. If you set a `default_next_key` on the last link, it becomes an override and the pool is bypassed.

**When a chain ends with NULL:** The resolve route checks for future unresolved content on the track. If any exists → track stays ACTIVE and pool scan serves the next eligible storylet. If none exists → track COMPLETED.

---

## Rule 3: One track per storylet. No cross-track references.

Every storylet belongs to exactly one track. The engine only looks up `next_key` within the same `track_id`. A `next_key` or `default_next_key` pointing to a storylet on a different track will:
- Fail silently
- Set a broken pointer on `track_progress`
- Kill the track

**Never do this:**
```
storylet on ROOMMATE track
  default_next_key: "dorm_hallmates"  ← this is on BELONGING track → BROKEN
```

**If you need two tracks to advance at the same time:** They advance independently. Put a storylet on each track with the same `due_offset_days`. The engine serves up to 2 at a time across all tracks.

---

## Rule 4: `due_offset_days` controls WHEN. Segment controls WHICH SLOT.

```
due_offset_days = 0  → available from started_day (Day 0 = arrival)
due_offset_days = 1  → available from started_day + 1 (Day 1)
due_offset_days = 2  → available from started_day + 2 (Day 2)
```

`due_offset_days` is relative to `started_day`, NOT the current day. A storylet with `due_offset_days: 1` is always due on Day 1, regardless of when the player resolves Day 0 content.

**Segment** controls which part of the day:
- `segment: "morning"` → only surfaces during morning
- `segment: "afternoon"` → only surfaces during afternoon
- `segment: "evening"` → only surfaces during evening
- `segment: null` → surfaces in ANY segment (use sparingly — this competes with everything)

**The scheduling formula:**
```
WHEN does it appear?  → due_offset_days
WHICH SLOT?           → segment
HOW LONG is it available? → expires_after_days (generous: 7 for orientation)
```

---

## Rule 5: Max 2 storylets shown at once. Segment is your scheduling tool.

The engine returns at most 2 storylets across ALL tracks, sorted by soonest expiry. If 3 tracks all have morning content due, only 2 appear.

**To avoid collisions:** Put storylets in different segments. Design the day so each segment has at most 2 tracks with content due:

```
Day 1:
  Morning:   roommate (first_morning) + belonging (morning_after_*)  → 2 slots, full
  Afternoon: academic (advisor_visit)                                → 1 slot, fine
  Evening:   belonging (evening activity)                            → 1 slot, fine
```

**If you MUST have 3+ tracks in one segment:** The player sees the 2 most urgent. The third appears after one of the first two is resolved (next page load). This works but feels like a queue, not a natural day. Prefer segment separation.

---

## Rule 6: `requires_choice` gates pooled content. It checks `choice_log.option_key`.

A pooled storylet with `requirements: { requires_choice: "go_to_party" }` only surfaces if the player previously picked a choice with `id: "go_to_party"` on the SAME track.

**Critical:** `requires_choice` is track-scoped. A choice made on the belonging track can only gate other belonging storylets. It cannot gate roommate or academic storylets.

**The option_key must match the choice ID exactly.** Check the source storylet's JSON:
```json
{ "id": "go_to_party", "label": "Head to Anderson Hall with Doug" }
```
The `requires_choice` value is `"go_to_party"` — the `id` field, not the label.

---

## Rule 7: `order_index` only matters for the FIRST storylet on a track.

`buildInitialTrackProgress()` finds the storylet with the lowest `order_index` on each track and sets it as the starting point. After that, `order_index` is NEVER read again.

**For chain mode:** Sequencing is controlled by `next_key`, not `order_index`.
**For pool mode:** Sequencing is controlled by `due_offset_days` and `segment`, not `order_index`.

Set `order_index` correctly on the first storylet of each track. For all other storylets, `order_index` can be any value — it's ignored. Don't use it to imply sequencing. It doesn't.

---

## Rule 8: `expires_after_days` must be generous for orientation content.

```
expires_after_days = 0  → only available on its due day
expires_after_days = 7  → available for 8 days (due day + 7)
```

If a player is slow and doesn't resolve Day 0 content until Day 2, a Day 1 storylet with `expires_after_days: 0` will have expired before they reach it. The storylet never surfaces and the content is lost.

**For all orientation content (Days 0-3):** Set `expires_after_days: 7`. Tight windows are for time-pressure content during active weeks, not onboarding.

**When a storylet expires unresolved:** It stays in the pool but fails the due-window check. If it's the only content on the track and it expires, the track may complete. Use generous windows to prevent this.

---

## Rule 9: Tags are metadata only. The engine does not read them.

`game_entry`, `arc_one`, `day1`, `onboarding` — these are for human reference and Content Studio display. The engine does NOT use tags for selection, gating, or sequencing.

**Do not rely on tags for engine behavior.** If you need a storylet to be the game entry point, ensure it's the lowest `order_index` on its track. If you need it gated, use `requires_choice`. Tags are labels, not instructions.

---

## Rule 10: Checklist for every new storylet migration.

Before writing any storylet migration, answer:

```
□ Is this CHAIN or POOL mode?
  CHAIN: What storylet's next_key points to this? Is it on the same track?
  POOL:  Does NOTHING point to this via next_key or default_next_key?

□ What track is this on?
  Confirm track_id matches. No cross-track references in any next_key.

□ What day does this appear?
  Set due_offset_days correctly (0 = arrival, 1 = first full day, etc.)

□ What segment?
  Set segment to morning/afternoon/evening. Avoid null unless intentional.

□ Will it collide with other tracks in this segment?
  Check: how many other tracks have content due on this day + segment?
  If 3+, move this to a different segment.

□ Does it have requirements?
  If gated by prior choice: set requires_choice with the exact choice ID.
  Confirm the source choice is on the SAME track.

□ What chains forward from this?
  If chain mode: set next_key or default_next_key to the next storylet.
  If pool mode: set default_next_key to NULL. Confirm no choice has next_key.
  If LAST in a chain before pool content: default_next_key MUST be NULL.

□ What's expires_after_days?
  Orientation: 7. Active weeks with time pressure: 1-3.

□ Is the previous chain endpoint correct?
  If this is the first pool storylet after a chain: confirm the chain's
  last storylet has default_next_key: NULL (not pointing to this storylet).
```

---

## Example: Day 0-1 Correct Wiring

```
ROOMMATE TRACK:
  room_214 (CHAIN, order=-1, due=0, morning)
    → default_next_key: "first_morning"
  first_morning (CHAIN, due=1, morning)
    → default_next_key: NULL  ← chain ends, pool takes over
  [future Day 2 roommate beat] (POOL, due=2, morning, no requires)
    → appears via pool scan on Day 2

BELONGING TRACK:
  dorm_hallmates (CHAIN, order=1, due=0, morning)
    → choices all next_key: "lunch_floor"
  lunch_floor (CHAIN, due=0, afternoon)
    → default_next_key: "evening_choice"
  evening_choice (CHAIN, due=0, evening)
    → default_next_key: NULL  ← CHAIN ENDS HERE. Pool takes over.
    → choices: go_to_party / go_to_cards / go_to_union (no next_key on any)
  morning_after_party (POOL, due=1, morning, requires_choice: "go_to_party")
  morning_after_cards (POOL, due=1, morning, requires_choice: "go_to_cards")
  morning_after_union (POOL, due=1, morning, requires_choice: "go_to_union")
    → all three: default_next_key: NULL, no choice next_keys
    → pool scan serves whichever matches the player's evening choice

ACADEMIC TRACK:
  admin_errand (CHAIN, order=0, due=0, morning)
    → default_next_key: "advisor_visit"
  advisor_visit (CHAIN, due=1, afternoon)
    → default_next_key: NULL  ← chain ends, pool takes over
  [future Day 2-3 academic beat] (POOL, due=2, afternoon, no requires)
```

---

## Anti-Pattern Summary

| Anti-Pattern | Why It Breaks |
|-------------|---------------|
| `default_next_key` pointing to a pooled storylet | Override bypasses pool; gated content never fires |
| `next_key` pointing cross-track | Silent failure; broken pointer kills the track |
| `segment: null` on multiple tracks same day | All compete for 2 slots; unpredictable suppression |
| `requires_choice` referencing a choice on another track | Gate never opens; choice_log is track-scoped |
| `order_index` used for sequencing after first storylet | Engine ignores it after initialization |
| `expires_after_days: 0` on orientation content | Slow players miss it permanently |
| Chain storylet with `default_next_key: NULL` in the middle of a sequence | Track falls to pool prematurely; rest of chain orphaned |
| Pool storylet that is ALSO a `next_key` target | Override always wins; pool gating is irrelevant |
