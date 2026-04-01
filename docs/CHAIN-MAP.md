# MMV Chain Map
> Maps every explicit storylet chain for existing Day 0 content, then sketches required chains for Days 0–3.
> Written from migration source + ENGINE-SPEC.md. Does not assume; cites evidence.
>
> Engine rule: a storylet is only reachable if a prior storylet on the **same track** explicitly names it
> as `next_key` (on a choice) or `default_next_key` (on the storylet). `order_index` only determines
> the initial entry point when `buildInitialTrackProgress()` creates a new progress row.
>
> "Day 0" = player's `started_day` (arrival). "Day N" = `started_day + N`.

---

## Current Chain State (post all migrations through 20260401000002)

### ROOMMATE TRACK

```
buildInitialTrackProgress → s_d1_room_214 (order_index = -1, due = Day 0)

s_d1_room_214  [morning, Day 0]
  storylet_key:    room_214
  default_next_key: first_morning
  choices:         head_out (no per-choice next_key → falls to default)
  → [default_next_key] → s_d1_first_morning

s_d1_first_morning  [morning, Day 1]
  storylet_key:    first_morning
  order_index:     1
  due_offset_days: 1  → due on started_day + 1
  default_next_key: NULL
  choices:         head_to_orientation (no per-choice next_key)
  → NULL → track COMPLETED
```

**State after Day 1 morning:** roommate track COMPLETED. No Day 2+ content.

---

### BELONGING TRACK

```
buildInitialTrackProgress → s_d1_dorm_hallmates (order_index = 1, due = Day 0)

s_d1_dorm_hallmates  [morning, Day 0]
  storylet_key:    dorm_hallmates
  default_next_key: NULL
  choices:
    admin_before_lunch → next_key: lunch_floor
    lunch_first        → next_key: lunch_floor
    noncommittal       → next_key: lunch_floor
  → [choice next_key] → s_d1_lunch_floor

s_d1_lunch_floor  [afternoon, Day 0]
  storylet_key:    lunch_floor
  due_offset_days: 0  → due on started_day + 0 = Day 0
  default_next_key: evening_choice
  choices:         laugh_with_doug / catch_keiths_eye / focus_on_food (no per-choice next_key)
  → [default_next_key] → s_d1_evening_choice

s_d1_evening_choice  [evening, Day 0]
  storylet_key:    evening_choice
  due_offset_days: 0
  default_next_key: NULL
  choices:
    go_to_party  → no next_key (precludes: s_d1_evening_cards, s_d1_evening_union — slugs don't exist)
    go_to_cards  → no next_key (precludes: s_d1_evening_party, s_d1_evening_union — slugs don't exist)
    go_to_union  → no next_key (precludes: s_d1_evening_party, s_d1_evening_cards — slugs don't exist)
  → NULL → track COMPLETED

s_d1_bench_glenn  [morning, Day 0]  — DISABLED (is_active = false), order_index = 4
  Unreachable: nothing chains to it; is_active has no effect in track engine
  but no chain pointer exists so it will never appear regardless.
```

**State after Day 0 evening:** belonging track COMPLETED. No Day 1+ content.

---

### ACADEMIC TRACK

```
buildInitialTrackProgress → s_d1_admin_errand (order_index = 0, due = Day 0)

s_d1_admin_errand  [morning, Day 0]
  storylet_key:    admin_errand
  due_offset_days: 0
  default_next_key: NULL
  choices:
    full_meal_plan / standard_meal_plan / minimum_meal_plan (no per-choice next_key)
  → NULL → track COMPLETED
```

**State after Day 0 morning:** academic track COMPLETED immediately.

---

### MONEY / OPPORTUNITY / HOME TRACKS

No storylets with these `track_id` values exist in active migrations.
`buildInitialTrackProgress` skips tracks with zero storylets.
No `track_progress` rows are created for these tracks.

---

### Orphaned / Floating Storylets

These exist in the DB but are unreachable via the track engine:

| Slug | Track | Reason unreachable |
|------|-------|--------------------|
| `s_d1_bench_glenn` | belonging | `is_active=false`; nothing chains to it anyway |
| `s_d1_dorm_roommate` | roommate | `is_active=false` (disabled in 20260331000002) |

---

## What "Day 0" and "Day N" Mean

| Engine term | Calendar meaning | Content currently built |
|-------------|-----------------|------------------------|
| Day 0 (due_offset=0) | Arrival day: morning → afternoon → evening | room_214, dorm_hallmates, lunch_floor, evening_choice, admin_errand |
| Day 1 (due_offset=1) | First full orientation day: morning | first_morning |
| Day 2 (due_offset=2) | Orientation Day 2 | nothing |
| Day 3 (due_offset=3) | Orientation Day 3 | nothing |

---

## Required Chains for Days 0–3

Based on HANDOFF.md ("Orientation is Days 0–3 before classes"), STORYLINE_MAP.md, and existing content.
This is a planning skeleton — it maps what the engine needs, not what the prose says.

### ROOMMATE TRACK

```
Day 0
  room_214 → first_morning ✓ (fixed in 20260401000002)

Day 1
  first_morning → [?? orientation assembly or dorm morning Day 2 ??]
  STATUS: default_next_key = NULL → COMPLETED prematurely.
  NEEDED: chain to the next roommate beat on Day 1 or Day 2.

Day 2–3
  Not designed. Likely: first real roommate friction or rapport beat.
  Must be on the ROOMMATE track with due_offset_days = 2 or 3.
```

### BELONGING TRACK

```
Day 0
  dorm_hallmates → lunch_floor → evening_choice ✓ (fully wired)

Day 1
  evening_choice ends with default_next_key = NULL → COMPLETED.
  NEEDED: a Day 1 belonging beat (orientation hall? first campus social?)
  Must be chained from evening_choice OR the track restarts (not currently possible).

  PROBLEM: once evening_choice resolves with NULL, the belonging track is COMPLETED
  and cannot surface new storylets. Day 1 belonging content requires evening_choice
  to chain into it, OR a separate track activation mechanism.

Day 2–3
  Same issue. No path forward unless evening_choice gains a next_key.
```

### ACADEMIC TRACK

```
Day 0
  admin_errand → NULL → COMPLETED immediately.
  NEEDED: chain from admin_errand to the next academic beat.

Day 1–3
  No academic storylets built for Days 1–3. First class is Day 4+ (classes begin).
  Orientation-specific academic beats (advisor meeting, course registration) need
  due_offset_days = 1–3 and must be chained from admin_errand.
```

### MONEY / OPPORTUNITY / HOME TRACKS

```
No content built for any of these tracks.
buildInitialTrackProgress skips tracks with no storylets → no progress rows.
Until at least one storylet exists per track, these tracks are silent.
```

---

## Engine Constraint Flags

Issues in the current design or the HANDOFF/STORYLINE_MAP vision that conflict with
how the engine actually works. Each flag describes the conflict and the implication.

---

### FLAG 1 — Belonging track COMPLETES on Day 0; no Day 1+ path

**Where:** `s_d1_evening_choice`, `default_next_key = NULL`
**Engine behavior:** `state = COMPLETED` after evening_choice resolves. COMPLETED tracks never surface again.
**Conflict with design:** STORYLINE_MAP expects ongoing belonging storylets through Week 4. These are unreachable once the track COMPLETES.
**Fix required:** evening_choice must chain into Day 1 content via `default_next_key`. That Day 1 storylet needs `due_offset_days = 1`. Then Day 1 chains to Day 2, etc. Every gap in the chain kills the track permanently.

---

### FLAG 2 — Academic track COMPLETES on Day 0; all future academic content unreachable

**Where:** `s_d1_admin_errand`, `default_next_key = NULL`
**Engine behavior:** Academic track COMPLETEs after the meal plan choice. All future academic storylets (first class, office hours, paper due) are on this track and need to be chained from admin_errand.
**Fix required:** admin_errand needs `default_next_key` pointing to the next academic beat.

---

### FLAG 3 — STORYLINE_MAP uses slug-based branching that the track engine doesn't support

**Where:** STORYLINE_MAP references gates like `s14_marsh_office_hours available only if s7_first_class ran`.
**Engine behavior:** The track engine has no cross-storylet flag-gate system. Track engine only checks: (a) is the progress ACTIVE? (b) is today >= storylet_due_day? (c) does current_storylet_key exist in this track? Requirements and conditions in the `requirements` field are **not read** by the track engine (only by the legacy selectStorylets system).
**Fix required:** Conditional gates must be implemented either as: (a) separate track branches triggered by choice `next_key` values, or (b) node-level `condition` fields (local to a conversational storylet's node walk), or (c) NPC memory checks in the node system. Cross-storylet gating ("show this only if that completed") is not natively supported.

---

### FLAG 4 — Due date calculation is relative to started_day, not current day

**Where:** ENGINE-SPEC.md §3, resolve route line 205:
`nextDueDay = progressRow.started_day + nextStorylet.due_offset_days`
**Conflict with design:** If a player is slow and resolves Day 0 content on calendar Day 3, a storylet with `due_offset_days = 1` will be due on `started_day + 1`, which is already in the past. It will appear immediately (not "tomorrow"). This is not wrong per se, but content with expiry windows (expires_after_days) may expire before the player reaches it if they play slowly.
**Implication:** For orientation content (Days 0–3), set `expires_after_days` generously (7+). Tight expiry windows only make sense for time-sensitive content in active weeks.

---

### FLAG 5 — evening_choice precludes reference non-existent slugs

**Where:** `s_d1_evening_choice`, all three choices:
  - `precludes: ["s_d1_evening_cards", "s_d1_evening_union"]` (don't exist)
  - `precludes: ["s_d1_evening_party", "s_d1_evening_union"]` (don't exist)
  - `precludes: ["s_d1_evening_party", "s_d1_evening_cards"]` (don't exist)
**Engine behavior:** Preclusion silently fails for non-existent slugs. No crash, no effect.
**Fix required:** Either create the three variant storylets (`s_d1_evening_party`, `s_d1_evening_cards`, `s_d1_evening_union`) as separate slugs, or rework preclusion to reference the choice IDs within this single storylet.

---

### FLAG 6 — maxStorylets = 2 caps Day 0 content delivery

**Where:** `selectTrackStorylets()`, default `maxStorylets = 2`.
**Conflict with design:** Day 0 has content on 3 active tracks (roommate, belonging, academic). All three could be "due" simultaneously (all have `due_offset_days = 0`). Only 2 show at once, sorted by soonest expiry. Depending on segment timing, admin_errand (academic) may be suppressed by the 2-slot cap while roommate and belonging content runs.
**Implication:** Segment assignment is the primary scheduling tool. Content on different segments avoids competition. room_214 (morning) and dorm_hallmates (morning) plus admin_errand (morning) — three morning-segment storylets compete for 2 slots. One will be delayed or dropped.

---

### FLAG 7 — bench_glenn (Glenn/Contact scene) is orphaned

**Where:** `s_d1_bench_glenn`, disabled and unchained.
**Design intent:** The Contact scene is the time-travel reveal — a critical narrative beat. Currently it's disabled and nothing chains to it.
**Fix required:** Decision needed on which track carries the Contact scene and when in the sequence it fires. Once decided: (a) enable it, (b) chain to it from the correct prior storylet, (c) decide what it chains to next.

---

### FLAG 8 — s_d1_first_morning slug prefix is inconsistent

**Where:** `s_d1_first_morning`, slug uses `d1_` prefix but `due_offset_days = 1` (Day 1 = post-arrival).
**Convention conflict:** All other `s_d1_*` slugs have `due_offset_days = 0` (arrival day). This storylet is Day 1 (post-arrival) by `due_offset_days` but `d1` by slug naming.
**Implication:** Low severity. Naming only. But if a future convention assigns `s_d1_*` = arrival day and `s_d2_*` = second day, this slug will be confusing. Consider renaming to `s_d2_first_morning` in a future migration.

---

## Sketch: Days 0–3 Required Chain Wiring

This is what needs to be true for the engine to serve content through Day 3.
Content not yet written is marked `[NOT BUILT]`.

```
ROOMMATE TRACK
  Day 0 morning:   room_214 (order=-1, due=0) ──────────────────────────────── ✓
    → default_next_key: first_morning
  Day 1 morning:   first_morning (order=1, due=1) ──────────────────────────── ✓
    → default_next_key: [Day 1 roommate beat, NOT BUILT] (due=1)
  Day 2:           [roommate beat, NOT BUILT] (due=2)
    → default_next_key: [Day 2 roommate beat, NOT BUILT] (due=2 or 3)
  Day 3:           [roommate beat, NOT BUILT] (due=3)
    → default_next_key: [Day 4 first-class-week roommate beat, NOT BUILT]

BELONGING TRACK
  Day 0 morning:   dorm_hallmates (order=1, due=0) ─────────────────────────── ✓
    → choice next_key: lunch_floor
  Day 0 afternoon: lunch_floor (order=2, due=0) ────────────────────────────── ✓
    → default_next_key: evening_choice
  Day 0 evening:   evening_choice (order=3, due=0) ─────────────────────────── ✓ (wired, but...)
    → default_next_key: [Day 1 belonging beat, NOT BUILT] (due=1)  ←── BROKEN: currently NULL
  Day 1:           [belonging beat, NOT BUILT] (due=1)
    → default_next_key: [Day 2 belonging beat, NOT BUILT] (due=2)
  Day 2:           [orientation social / belonging beat, NOT BUILT] (due=2)
    → default_next_key: [Day 3 beat, NOT BUILT] (due=3)

ACADEMIC TRACK
  Day 0 morning:   admin_errand (order=0, due=0) ───────────────────────────── ✓ (wired, but...)
    → default_next_key: [Day 1-3 academic beat, NOT BUILT] (due=1–3) ←── BROKEN: currently NULL
  Day 1–3:         [NOT BUILT] — advisor, course add/drop, orientation session
  Day 4+:          [first_class beat, NOT BUILT]

MONEY TRACK
  Day 0–3:         No content. Track silent.
  When to start:   STORYLINE_MAP suggests money friction appears Week 2.
                   A Day 5–7 entry storylet would be the first money beat.
                   Must create at least one storylet with this track_id to get a progress row.

OPPORTUNITY TRACK
  Day 0–3:         No content. Track silent.
  When to start:   Orientation fair / bulletin board encounter — Day 1–3 range.

HOME TRACK
  Day 0–3:         No content. Track silent.
  When to start:   Parent phone call — STORYLINE_MAP suggests Day 3–4 (Week 1).
```

---

*Source: `supabase/migrations/20260330000001_replace_day1_content.sql`,
`20260330000002_fix_day1_track_wiring.sql`, `20260331000001_add_room_214_opening.sql`,
`20260331000002_fix_day1_sequencing.sql`, `20260331100000_rewrite_room_214_conversational.sql`,
`20260401000001_first_morning_and_hallmates_fix.sql`, `20260401000002_fix_roommate_chain.sql`,
`docs/ENGINE-SPEC.md`, `docs/CONTENT-INVENTORY.md`, `HANDOFF.md`, `docs/STORYLINE_MAP.md`*
