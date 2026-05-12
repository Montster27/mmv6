# Slot-Guarantee Policy Spec
## T-1778077549001 — Routine-mode vs pool-storylet day-window collision

**Status:** Draft — awaiting PM policy decision  
**Author:** Code  
**Date:** 2026-05-11  
**Closes:** T-1778077549001 (spike); determines T-1778077549002, T-1778077549004

---

## 1. Current engine behavior (verified from code)

### Pool scan (`selectTrackStorylets.ts:246–258`)

For each ACTIVE track's progress row, the engine scans all storylets on that
track and finds the single most-urgent eligible one:

```
dueDay      = prog.started_day + storylet.due_offset_days
expiresOnDay = dueDay + storylet.expires_after_days

eligible if: dueDay ≤ dayIndex ≤ expiresOnDay
             AND segment matches (or is null)
             AND requirements met
             AND not already resolved or precluded
```

Best candidate = earliest `expiresOnDay` (soonest to expire = most urgent).

### Global cap

`maxStorylets = 2` (hard-coded default). All 6 active tracks may produce a
candidate but only 2 are served:
1. Reserved slot: 1 frame-story track candidate (if any)
2. Remaining slot(s): life-stream track candidates, urgency-ordered

### `expires_after_days = 0`

Code: `expiresOnDay = dueDay + 0 = dueDay`.  
Eligible ONLY when `dayIndex === dueDay`. The code is strict. No lenient +1.  
See §2 for why the audit nonetheless observed delays.

---

## 2. Root cause analysis of audit findings

### Finding A: Universal 1-day delay (all beats slide +1)

**Cause: `started_day` anchoring, not engine math.**

`prog.started_day` is set by `buildInitialTrackProgress` to `dayIndex` at the
moment the player first loads Chapter One. On the audit walk this was Day 1
(day_index=1), not Day 0.

Result: a beat authored as `due_offset_days: 3` ("Day 3 morning") computes
`dueDay = 1 + 3 = 4` — it fires on Day 4, not Day 3.

This is a **content authoring contract mismatch**, not an engine bug.  
Authors wrote beats against an absolute calendar ("Day 3") but the engine
interprets `due_offset_days` as relative to `started_day`.

**Verify:** query `track_progress WHERE user_id = '<audit user>' → started_day`.  
If `started_day = 1`, every beat fires 1 day late by design.

### Finding B: Beat 2B silently dropped (never served)

**Cause: `maxStorylets = 2` cap + equal priority.**

Beat 2B (`lounge_cards_night`, Day 9 evening) competed against 2 other
equally-urgent life-stream beats on the same evening. The 2-slot cap filled
with the 2 most-urgent beats (earliest expiry); 2B lost the competition and
its window expired the next day.

This is a **priority signal absence** — nothing told the engine that 2B was
more important than the beats that won.

### Finding C: `expires_after_days = 0` delayed despite single-day window (Beat 2G)

Follows directly from Finding A. Beat 2G has `expires_after_days: 0` and
`due_offset_days: 6`. With `started_day = 1`:
- `dueDay = 7`, `expiresOnDay = 7`
- The beat is eligible ONLY on Day 7 — which is Day 6 in the author's
  intent, but Day 7 in the runtime. This is the +1 shift.

The code correctly enforces `expires_after_days = 0` as single-day. The
"delay" is the started_day offset, not a leniency bug.

**Implication for T-1778077549002:** the `expires_after_days = 0` semantic
does NOT have an engine bug. T-1778077549002 may be a misdiagnosis; re-check
against audit user's `started_day` before implementing a fix.

---

## 3. Policy options

### Option 1: Strict expiry (content patch only)

**Engine change:** none.  
**Content change:** extend friction beat windows to ≥3 days; author 2B with
wider window. Accept that beats may arrive 1 day late if started_day ≠ 0.  
**Fix Finding A:** no (authoring contract stays ambiguous).  
**Fix Finding B:** partially — wider windows reduce drop risk but don't prevent
it when competition is high.  
**Fix Finding C:** no.

**Authoring contract:** "Use wider windows. Accept that scheduling is
best-effort. If a beat must fire, use a 3-day window and test."

**Pros:** zero engine changes. Ship immediately.  
**Cons:** ambiguous contract — future beat authors hit the same problem. Doesn't
prevent drops under deep routine commitment.

---

### Option 2: Pool yields routine (dual slot lanes)

**Engine change:** major — routine commits and pool storylets get separate slot
lanes per segment; pool storylets always get their authored slot.  
**Content change:** none.  
**Fix Finding A:** depends on whether started_day is also fixed.  
**Fix Finding B:** yes — 2B would always get a slot if eligible.  
**Fix Finding C:** depends on started_day fix.

**Authoring contract:** "Pool storylets always get their slot. Routine is
additive."

**Pros:** strongest content guarantee.  
**Cons:** most complex engine change. Raises questions: how many total slots per
segment? Does the player see 4 cards in one morning? Routine activities still
need to surface somehow.

---

### Option 3: Typed-slot priority (recommended)

**Engine change:** minimal — add `priority` column to storylets; engine serves
high-priority beats before filling remaining slots with normal-priority content.  
**Content change:** friction beats tagged `priority: 100`.  
**Additional fix:** clamp `started_day = 0` (or document that `due_offset_days`
is relative to started_day and provide conversion tooling).

**Fix Finding A:** yes, via started_day fix.  
**Fix Finding B:** yes — high-priority 2B wins its slot even if two
normal-priority beats compete.  
**Fix Finding C:** yes, same started_day fix.

**Authoring contract:** "High-priority beats (`priority: 100`) are guaranteed
their authored slot when eligible, ahead of normal content. `due_offset_days`
is relative to Chapter One start; authored values assume `started_day = 0`."

**Pros:** expressive, scales to all future tight-window content. Minimal engine
change. Doesn't require dual slot pools.  
**Cons:** requires DB migration (new `priority` column); content authors must
know which beats need `priority: 100`.

---

## 4. Recommendation: Option 3 (Typed-slot priority)

### Rationale

Option 1 doesn't prevent future drops — it shifts the problem to content
authors. Option 2 requires architectural changes (dual slot pools, segment-cap
math, routine surfacing changes) that touch more code than this spike warrants.

Option 3 is a focused signal: "this beat must not be crowded out". It solves
the actual design intent (friction beats SHOULD be higher priority than routine
filler) with a small, reversible change.

### Implementation scope

**Phase A — started_day fix (unblocks Finding A + C):**

Ensure `started_day = 0` for Chapter One when the player's game starts. The
player's `day_index` may be 1 when they first load, but `started_day` on
`track_progress` should be clamped to 0 so `due_offset_days` maps to absolute
days as authored.

```ts
// In buildInitialTrackProgress and/or when auto-creating progress mid-play:
started_day: Math.min(startedDay, 0)   // clamp to 0 for Chapter One
```

Or alternatively: add a `chapter_start_day` column to `track_progress` (set
once when Chapter One begins, always 0 for the initial player) and compute
`dueDay = chapter_start_day + due_offset_days`.

**Complexity:** Low. One constant change + migration if column approach. No
pool scan logic changes.

**Phase B — priority column + engine sort (unblocks Finding B):**

```sql
-- Migration
ALTER TABLE storylets ADD COLUMN priority INT NOT NULL DEFAULT 50;
```

Engine change in `selectTrackStorylets.ts` pool scan and sort:

```ts
// Sort candidates: high-priority first, then urgency
result.sort((a, b) => {
  const pDiff = (b.storylet.priority ?? 50) - (a.storylet.priority ?? 50);
  if (pDiff !== 0) return pDiff;
  return a.expires_on_day - b.expires_on_day;
});
```

Content migration: friction beats get `priority: 100` in migration.

**Complexity:** Low-medium. One migration + ~5 lines of engine logic + content
migration for ~8 existing friction beats.

### Coordination with downstream tickets

| Ticket | Outcome under Option 3 |
|--------|----------------------|
| T-1778077549002 (`expires_after_days=0`) | Re-verify after started_day fix. If delay disappears, close as no-action. |
| T-1778077549004 (Beat 2B drop) | Close when priority column ships and 2B gets `priority: 100`. |
| T-1778100000001 (money-as-band) | Transition beats authored with `priority: 100`; they get their slot. |
| T-1778100000005 (reflection) | Crowd-out write: log `reason: "slot_cap"` when a normal-priority beat loses. High-priority beats write `reason: "none"`. |

### Migration plan for existing friction beats

8 friction beats shipped under T-1776329282001. All should be updated to
`priority: 100` in the same migration that adds the column:

```sql
UPDATE storylets
SET priority = 100
WHERE storylet_key IN (
  'hallway_morning_day3',   -- 2A
  'lounge_cards_night',     -- 2B
  'walk_to_class_day4',     -- 2C
  'study_group_forming',    -- 2D
  'priya_dining_hall',      -- 2E
  'floor_lounge_tv_day7',   -- 2F
  'floor_hallway_day6',     -- 2G
  'home_pay_phone'          -- 2H (if exists)
);
```

### Content authoring contract (post-Option 3)

> `due_offset_days` is relative to Chapter One start (always Day 0 for new
> players). `due_offset_days: 5` = Day 5. `expires_after_days: 2` = eligible
> Days 5, 6, 7.
>
> `priority: 100` guarantees the beat wins its slot when two or more beats
> compete. Use for any content that MUST fire in its window (friction beats,
> crystallizer unlock beats, gate-threshold beats). Default priority (50) is
> best-effort.
>
> `expires_after_days: 0` = serves on exactly one authored day. Use only with
> `priority: 100` or accept that the beat may be dropped.

---

## 5. Implementation estimate

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase A: started_day fix | 1 constant + progress insert change + verify | 0.5 days |
| Phase B: priority column | 1 migration + engine sort (5 lines) + friction-beat migration | 1.5 days |
| T-1778077549002 verify/close | SQL check + close or fix | 0.5 days |
| Total | | ~2.5 days |

---

## 6. Open questions for PM

1. **Confirm Option 3** (or redirect to 1 or 2).
2. **started_day clamp approach**: simple constant fix (`min(dayIndex, 0)`) OR
   add `chapter_start_day` column for explicit tracking? Recommend: constant
   fix first, column if we ever need to restart Chapter One mid-game.
3. **Priority scale**: binary (100/50) vs. continuous scale? Recommend: binary
   for now — add values when a use case requires them.
4. **Beat 2B content review**: if 2B fires reliably, its content must work
   under the range of states a player has on Day 9. PM: confirm the storylet
   still makes sense given possible Day 9 state (Scott interactions, belonging
   level).

---

## 7. Acceptance criteria for spike close

- [ ] PM approves option (Options 1, 2, or 3 — or a documented fourth)
- [ ] `docs/SLOT-GUARANTEE-SPEC.md` committed with PM approval noted
- [ ] Build ticket(s) filed with `relates_to: T-1778077549001`
- [ ] T-1778077549002 verdict noted (close as no-action or keep open)
- [ ] T-1778077549004 marked as closed (blocked on priority build)
