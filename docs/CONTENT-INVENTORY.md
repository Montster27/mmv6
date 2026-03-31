# MMV Content Inventory
> Generated 2026-03-31 by scanning supabase/migrations/ and src/ directly.
> Source of truth: migration files, not TASKS.md.

---

## Summary

| Item | Count |
|------|-------|
| **Active storylets** | 7 |
| **Days covered** | 1 only |
| **NPCs in registry** | 11 |
| **NPCs appearing in Day 1** | 7 |
| **Tracks with content** | 3 of 6 |
| **Mini-games wired** | 3 (caps, memory, snake) |
| **Dead-end precludes (slugs that don't exist)** | 6 |
| **Day 2+ storylets** | 0 |

---

## Storylets

All active storylets are from migration `20260330000001_replace_day1_content.sql`.
All earlier content was wiped by `20260309000001_clear_all_content.sql` and subsequent targeted deletes.

### S1 — `s_d1_the_quad`
**Title:** The Quad
**Track:** `belonging` (order_index = -1, step_key = `the_quad`)
**Segment:** morning | **Time cost:** 0h
**NPCs introduced:** none
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `opening`, `day1`
**default_next_key:** NULL (no auto-advance)

| Choice ID | Label | Identity | Deltas | Leads To |
|-----------|-------|----------|--------|----------|
| `read_bulletin` | Stop and read the bulletin board | people | stress -1 | *(inline reaction, no next)* |
| `keep_walking` | Keep walking — find the dorm | safety | — | *(inline reaction, no next)* |
| `sit_and_watch` | Sit on the low wall and watch | people | energy +1, stress -1 | *(inline reaction, no next)* |

**Notes:** No next_key on any choice. Standalone — track engine advances via order_index sequence.

---

### S2 — `s_d1_dorm_roommate`
**Title:** Room 214
**Track:** `roommate` (order_index = 0, step_key = `dorm_roommate`)
**Segment:** morning | **Time cost:** 0h
**NPCs introduced:** `npc_roommate_scott` (Scott)
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `roommate`, `day1`
**default_next_key:** `dorm_hallmates` → s_d1_dorm_hallmates

| Choice ID | Label | Identity | Deltas | Events |
|-----------|-------|----------|--------|--------|
| `unpack` | Start unpacking | safety | stress -1 | Scott: INTRODUCED_SELF |
| `ask_tapes` | "What've you got?" — nod at the tapes | people | stress -1 | Scott: INTRODUCED_SELF + SMALL_KINDNESS |
| `look_window` | Look out the window | safety | — | Scott: NOTICED_FACE |

---

### S3 — `s_d1_dorm_hallmates`
**Title:** Down the Hall
**Track:** `belonging` (order_index = 1, step_key = `dorm_hallmates`)
**Segment:** morning | **Time cost:** 0h
**NPCs introduced:** `npc_floor_doug` (Doug), `npc_floor_mike` (Mike), `npc_floor_keith` (Keith)
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `belonging`, `day1`
**default_next_key:** NULL

| Choice ID | Label | Identity | Deltas | Events | Notes |
|-----------|-------|----------|--------|--------|-------|
| `admin_before_lunch` | "I need to drop something at admin first" | achieve | stress +1 | Doug + Keith: INTRODUCED_SELF, Mike: NOTICED_FACE | Implies admin errand next, not hard-wired |
| `lunch_first` | "I'll come" | people | stress -1 | Doug + Keith: INTRODUCED_SELF, Mike: NOTICED_FACE | |
| `noncommittal` | "I might catch up with you" | safety | — | All three: NOTICED_FACE only | |

**Notes:** No default_next_key. The choice text implies a branch (`admin_before_lunch` → admin errand, `lunch_first` → skip to lunch) but neither next_key nor targetStoryletId is set in the choice JSON. The engine can't auto-navigate between these.

---

### S4 — `s_d1_admin_errand`
**Title:** The Administration Building
**Track:** `academic` (order_index = 0, step_key = `admin_errand`)
**Segment:** morning | **Time cost:** 1h
**NPCs introduced:** none
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `academic`, `day1`
**default_next_key:** NULL

| Choice ID | Label | Identity | Deltas |
|-----------|-------|----------|--------|
| `full_meal_plan` | Full meal plan (3 meals/day, 7 days) | safety | stress -1, cashOnHand -200 |
| `standard_meal_plan` | Standard plan (lunch + dinner, weekdays) | achieve | cashOnHand -100 |
| `minimum_meal_plan` | Minimum plan (10 meals/week) | risk | stress +1, cashOnHand -50 |

**Notes:** No next_key. Floats as academic track beat 0 — arrives in the player's queue independently of belonging storylets.

---

### S5 — `s_d1_bench_glenn`
**Title:** The Bench
**Track:** `belonging` (order_index = 4, step_key = `bench_glenn`)
**Segment:** morning | **Time cost:** 1h
**NPCs introduced:** `npc_contact_glenn` (Glenn)
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `opening`, `frame`, `time_travel`, `contact`, `day1`
**default_next_key:** NULL

| Choice ID | Label | Identity | Deltas | Events |
|-----------|-------|----------|--------|--------|
| `ask_what_song` | "What is that song?" | risk | stress +5 | Glenn: INTRODUCED_SELF |
| `just_listen` | Stand there, not sure what to say | safety | stress +3 | Glenn: INTRODUCED_SELF |

**Notes:** This is the time-travel reveal. Glenn delivers all four directives in both paths (different cadence/tone, same content). Both choices are dead ends — no next_key. Assigned to `belonging` track at order=4, which places it after `evening_choice` (order=3). Sequencing issue: this should fire before or during the morning sequence, but the track orders it last (after the evening choice). See **Critical Issues** below.

---

### S6 — `s_d1_lunch_floor`
**Title:** The Dining Hall
**Track:** `belonging` (order_index = 2, step_key = `lunch_floor`)
**Segment:** afternoon | **Time cost:** 1h
**NPCs introduced:** none (Doug, Mike, Keith, Scott all appear but already introduced)
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `belonging`, `day1`
**default_next_key:** `evening_choice` → s_d1_evening_choice

| Choice ID | Label | Identity | Deltas | Events |
|-----------|-------|----------|--------|--------|
| `laugh_with_doug` | Laugh with Doug | people | stress -1 | Doug: SMALL_KINDNESS, Keith: AWKWARD_MOMENT |
| `catch_keiths_eye` | Catch Keith's eye | people | — | Keith: SMALL_KINDNESS |
| `focus_on_food` | Focus on your food | safety | energy +1 | none |

---

### S7 — `s_d1_evening_choice`
**Title:** First Night
**Track:** `belonging` (order_index = 3, step_key = `evening_choice`)
**Segment:** evening | **Time cost:** 1h
**NPCs introduced:** none (Bryce and Peterson are named in body text but not in `introduces_npc` array)
**Tags:** `arc_one`, `arc_one_core`, `onboarding`, `belonging`, `day1`
**default_next_key:** NULL

| Choice ID | Label | Identity | Energy | Stress | Mini-game | Precludes | sets_track_state |
|-----------|-------|----------|--------|--------|-----------|-----------|-----------------|
| `go_to_party` | Head to Anderson Hall with Doug | risk, people | -3 | -2 | caps | `s_d1_evening_cards`, `s_d1_evening_union` | belonging → `first_anchor` |
| `go_to_cards` | Go to the card game in the lounge | people, achieve | -1 | -2 | memory | `s_d1_evening_party`, `s_d1_evening_union` | belonging → `first_anchor` |
| `go_to_union` | Walk down to the student union | safety | 0 | -1 | snake | `s_d1_evening_party`, `s_d1_evening_cards` | belonging → `first_anchor` |

**Notes:** All three choices share the same outcome: end of Day 1, player goes to sleep. Bryce (`npc_anderson_bryce`) and Peterson (`npc_floor_peterson`) appear in the scene and reaction text but are not in the `introduces_npc` array — they'll never get their short_intro prepended. See **Critical Issues** below.

---

## NPC Registry

11 NPCs defined in `src/domain/npcs/registry.ts`.

| NPC ID | Display Name | Role / Context | Appears In Storylets | introduces_npc in |
|--------|-------------|----------------|---------------------|--------------------|
| `npc_roommate_scott` | Scott | Roommate, men's dorm | S2, S6, S7 (body) | S2 |
| `npc_contact_glenn` | Glenn | The Contact (time-travel reveal) | S5 | S5 |
| `npc_floor_doug` | Doug | Floormate — knows everyone, plans things | S3, S6, S7 (body) | S3 |
| `npc_floor_mike` | Mike | Floormate — studious, careful | S3, S6, S7 (body) | S3 |
| `npc_floor_keith` | Keith | Floormate — farm background, grounded | S3, S6, S7 (body) | S3 |
| `npc_anderson_bryce` | Bryce | Party host at Anderson Hall | S7 (body only) | **NEVER** |
| `npc_floor_peterson` | Peterson | Card game host (lounge) | S7 (body only) | **NEVER** |
| `npc_prof_marsh` | Marsh | English lecturer | No storylet yet | — |
| `npc_studious_priya` | Priya | Sociology section, campus | No storylet yet | — |
| `npc_ambiguous_jordan` | Jordan | Recurring mystery character | No storylet yet | — |
| `npc_parent_voice` | your parent | Hallway phone | No storylet yet | — |

**Note:** Bryce and Peterson are in the registry and appear in scene text but are never in an `introduces_npc` array. Their `short_intro` will never be shown.

---

## Branching Map

```
[Game Start]
     │
     ▼
s_d1_the_quad (belonging, order=-1, morning)
  ├─ read_bulletin ──────────────────────────────► [reaction text only] ─► track advance
  ├─ keep_walking ───────────────────────────────► [reaction text only] ─► track advance
  └─ sit_and_watch ──────────────────────────────► [reaction text only] ─► track advance

s_d1_dorm_roommate (roommate, order=0, morning)    ← independent track
  ├─ unpack ─────────────────────────────────────► default_next: dorm_hallmates
  ├─ ask_tapes ──────────────────────────────────► default_next: dorm_hallmates
  └─ look_window ────────────────────────────────► default_next: dorm_hallmates
                                                           │
                                                           ▼
s_d1_dorm_hallmates (belonging, order=1, morning)  ← (but also belongs to belonging track)
  ├─ admin_before_lunch ─────────────────────────► [no next_key — implied: admin_errand] ⚠️
  ├─ lunch_first ────────────────────────────────► [no next_key — implied: lunch_floor] ⚠️
  └─ noncommittal ───────────────────────────────► [no next_key] ⚠️

s_d1_admin_errand (academic, order=0, morning)     ← independent track
  ├─ full_meal_plan ─────────────────────────────► [no next_key] ⚠️
  ├─ standard_meal_plan ─────────────────────────► [no next_key] ⚠️
  └─ minimum_meal_plan ──────────────────────────► [no next_key] ⚠️

s_d1_lunch_floor (belonging, order=2, afternoon)
  ├─ laugh_with_doug ────────────────────────────► default_next: evening_choice
  ├─ catch_keiths_eye ───────────────────────────► default_next: evening_choice
  └─ focus_on_food ──────────────────────────────► default_next: evening_choice
                                                           │
                                                           ▼
s_d1_evening_choice (belonging, order=3, evening)
  ├─ go_to_party (mini: caps) ───────────────────► [reaction text only] ─► NULL ⚠️
  │   precludes: s_d1_evening_cards ⚠️ (doesn't exist)
  │   precludes: s_d1_evening_union ⚠️ (doesn't exist)
  ├─ go_to_cards (mini: memory) ─────────────────► [reaction text only] ─► NULL ⚠️
  │   precludes: s_d1_evening_party ⚠️ (doesn't exist)
  │   precludes: s_d1_evening_union ⚠️ (doesn't exist)
  └─ go_to_union (mini: snake) ──────────────────► [reaction text only] ─► NULL ⚠️
      precludes: s_d1_evening_party ⚠️ (doesn't exist)
      precludes: s_d1_evening_cards ⚠️ (doesn't exist)

s_d1_bench_glenn (belonging, order=4, morning)     ← fires AFTER evening by order? ⚠️
  ├─ ask_what_song ──────────────────────────────► [no next_key] ⚠️
  └─ just_listen ────────────────────────────────► [no next_key] ⚠️
```

---

## Stream Coverage

| Track | Storylets | Moments Covered | Days |
|-------|-----------|-----------------|------|
| **belonging** | 5 | Opening quad, meet floormates, dining hall, evening activity, Glenn encounter | Day 1 only |
| **roommate** | 1 | Meeting Scott (Room 214) | Day 1 only |
| **academic** | 1 | Admin errand + meal plan | Day 1 only |
| **money** | 0 | — | — |
| **opportunity** | 0 | — | — |
| **home** | 0 | — | — |

**Belonging is dramatically overloaded.** 5 of 7 storylets are assigned to it. The roommate track has only the room introduction; the academic track has only the admin errand.

---

## Critical Path: Can You Actually Play?

### What runs

1. Player loads `/play` → `useBootstrap()` fetches game state and tracks
2. Engine checks for `game_entry` tag to find the opening storylet
3. **`game_entry` tag is NOT set in any migration.** It must be set manually via Content Studio (Admin → Graph → click to set entry). If not set, `fetchGameEntryStorylet()` returns null and the game falls back to `getOrCreateDailyRun()` to fetch the day's candidates.
4. If Chapter One mode is active, `buildInitialTrackProgress()` creates 6 `track_progress` rows (one per track)
5. `selectTrackStorylets()` returns up to 2 storylets due today, filtered by current segment
6. The player plays storylets, makes choices, mini-games fire inline via `MiniGameShell`

### The playable path (assuming game_entry is set to `s_d1_the_quad`)

```
Open game
  → s_d1_the_quad (Morning: arrive on campus)
  → [track engine advances]
  → s_d1_dorm_roommate (Morning: meet Scott)  [roommate track]
  → s_d1_dorm_hallmates (Morning: meet Doug/Mike/Keith)  [belonging track]
  → s_d1_admin_errand (Morning: meal plan)  [academic track — independent queue]
  → s_d1_lunch_floor (Afternoon: dining hall)  [belonging track]
  → s_d1_evening_choice (Evening: party/cards/union + mini-game)  [belonging track]
  → [Day 1 ends — nothing on Day 2]
```

`s_d1_bench_glenn` is assigned to belonging at order=4, which is after `evening_choice` at order=3. With `segment: 'morning'` set on it, it will be filtered out during the evening segment. It would need to appear before the evening on Day 1 — but it's sequenced after it in the belonging track.

---

## Critical Issues (Dead Ends and Bugs)

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **`game_entry` tag not set in any migration** | `s_d1_the_quad` tags array | High — game may not start without manual Content Studio setup |
| 2 | **`s_d1_bench_glenn` fires after evening by track order** | order_index=4, after evening_choice=3 | High — the Contact scene should happen before evening; it's morning-tagged but sequenced last in belonging |
| 3 | **`precludes` arrays reference non-existent slugs** | `s_d1_evening_choice` all 3 choices | Medium — `s_d1_evening_cards`, `s_d1_evening_union`, `s_d1_evening_party` don't exist; preclusion silently fails |
| 4 | **`s_d1_dorm_hallmates` narrative branch not wired** | Choices `admin_before_lunch`, `lunch_first` | Medium — choice implies navigation but no next_key set; engine can't branch player into admin_errand vs lunch_floor |
| 5 | **Bryce and Peterson never formally introduced** | `s_d1_evening_choice` introduces_npc array | Low — both in registry, both named in scene, neither in introduces_npc; short_intro never shown |
| 6 | **No Day 2+ content** | All tracks | High (for playtest) — game hits a wall after Day 1 evening |
| 7 | **money, opportunity, home tracks: 0 storylets** | All three tracks | High — track_progress rows created but immediately stall |
| 8 | **`s_d1_admin_errand` default_next_key is NULL** | migration line 377 | Low — floats standalone; player gets it via academic track queue, not linked from hallmates |

---

## Mini-Games

All three mini-games are wired in `s_d1_evening_choice` only. They're mutually exclusive (one fires per run).

| Mini-game | Type | Triggered by | Component | Config |
|-----------|------|-------------|-----------|--------|
| Caps | `caps` | `go_to_party` | `CapsGame.tsx` | `{}` (default difficulty) |
| Memory | `memory` | `go_to_cards` | `MemoryCardGame.tsx` | `{}` (default difficulty) |
| Snake | `snake` | `go_to_union` | `SnakeGame.tsx` | `{}` (default difficulty) |

Adaptive difficulty tracker is live (`sessionWins`/`sessionLosses` per game type, clamped 0.2–0.9).
Sorting mini-game is designed but not built.

---

## What Needs to Happen Before a Full Day 1 Playtest

1. **Set `game_entry` tag** on `s_d1_the_quad` via Content Studio → Graph, or add it to the migration
2. **Fix `s_d1_bench_glenn` sequencing** — either move it to order=-0.5 (before dorm_roommate) or assign it to a different track, or flag it as a segment-overriding special case
3. **Wire the hallmates branch** — add `next_key: 's_d1_admin_errand'` to `admin_before_lunch` and `next_key: 's_d1_lunch_floor'` to `lunch_first`
4. **Fix precludes slugs** — either create separate storylets for each evening path (old approach) or change precludes to intra-choice IDs if the engine supports that
5. **Add Bryce and Peterson to `introduces_npc`** on `s_d1_evening_choice`

---

*Source files: `supabase/migrations/20260330000001_replace_day1_content.sql`, `20260330000002_fix_day1_track_wiring.sql`, `src/domain/npcs/registry.ts`, `src/lib/play.ts`, `src/app/(player)/play/page.tsx`*
