# Arc One Gap Analysis (T-006)
> Generated 2026-04-17 from live DB query. Covers Days 0-14 across all 6 tracks.

---

## 1. Inventory Summary

| Metric | Count |
|--------|-------|
| **Active storylets** | 30 |
| **Inactive storylets** | 5 |
| **Chain-mode storylets** | 5 |
| **Pool-mode storylets** | 25 |
| **Total slots (15 days x 3 segments)** | 45 |
| **Slots with at least 1 storylet** | 19 |
| **Empty slots** | 26 (58%) |
| **Designed collisions** | 6 |
| **Tracks with content** | 6/6 |

---

## 2. Coverage Matrix

Each cell shows: `track_key (storylet_key) [mode]`. Bold = collision (2+ tracks same slot). Empty = gap.

### Day 0 (Arrival)
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| **Morning** | **roommate** (`room_214`) CHAIN | **belonging** (`dorm_hallmates`) CHAIN | Designed collision |
| **Afternoon** | **belonging** (`lunch_floor`) CHAIN | **opportunity** (`glenn_pastime_paradise`) POOL | Designed collision |
| **Evening** | belonging (`evening_choice`) CHAIN | | 3-way preclusion point |

### Day 1
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| **Morning** | **roommate** (`first_morning`) CHAIN | **belonging** (`morning_after_*`) POOL | 1 of 3 variants fires |
| **Afternoon** | **academic** (`advisor_visit`) POOL | **opportunity** (`terminal_first_visit`) POOL | Opportunity gated by `requires_flag` |
| Evening | | | **GAP** |

### Day 2
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | | | **GAP** |

### Day 3
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | | | **GAP** |

### Day 4
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | money (`money_reality_check`) POOL | | Solo beat |

### Day 5
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | opportunity (`glenn_the_walk`) POOL | | Gated: `requires_flag: found_terminal` |
| Afternoon | | | **GAP** |
| Evening | | | **GAP** |

### Day 6
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | | | **GAP** |

### Day 7 (Routine-week activates)
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | money (`job_board`) POOL | | Solo beat |
| Evening | home (`pay_phone_line`) POOL | | Solo beat, home track entry |

### Day 8
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | academic (`heller_lecture`) POOL | | Solo beat |
| Afternoon | | | **GAP** |
| Evening | roommate (`dana_cereal`) POOL | | **NAME BUG: uses "Dana" not "Scott"** |

### Day 9
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | roommate (`dana_letter_*`) POOL | | 3 variants: avoidance/surface/connected. **NAME BUG** |

### Day 10
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | money (`first_shift_grounds`) POOL | money (`first_shift_dining`) POOL | Both gated; at most 1 fires |
| **Afternoon** | **belonging** (`miguel_guitar`) POOL | **money** (`first_shift_research`) POOL | Collision if player has research job |
| Evening | money (`first_shift_library`) POOL | | Gated |

### Day 11
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | belonging (`priya_dining_hall`) POOL | | Solo beat |
| Evening | | | **GAP** |

### Day 12
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | belonging (`doug_coach_story`) POOL | | Solo beat |

### Day 13
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| Evening | belonging (`tuesday_commitment`) POOL | | Solo beat |

### Day 14 (Tuesday night)
| Segment | Slot 1 | Slot 2 | Notes |
|---------|--------|--------|-------|
| Morning | | | **GAP** |
| Afternoon | | | **GAP** |
| **Evening** | **belonging** / **money** / **opportunity** / **roommate** | *(4 tracks, all gated)* | **MASSIVE COLLISION** — see below |

---

## 3. Collision Map

### Designed collisions (good — creates tension)
| Day | Segment | Tracks | Effect |
|-----|---------|--------|--------|
| 0 | morning | roommate + belonging | Both chain; both fire. Max 2. |
| 0 | afternoon | belonging + opportunity | Both fire. Glenn is subtle intro. |
| 1 | morning | roommate + belonging | Chain end + pool variant. |
| 1 | afternoon | academic + opportunity | Opportunity gated, so usually solo. |

### Emergent collisions (need design review)
| Day | Segment | Tracks | Risk |
|-----|---------|--------|------|
| 10 | morning | money (grounds) + money (dining) | Same track, both gated — OK, mutually exclusive. |
| 10 | afternoon | belonging + money (research) | Cross-track. Money gated, so usually solo. |
| **14** | **evening** | **belonging + money + opportunity + roommate** | **4-track pileup. All gated by `requires_flag`. Since flags aren't enforced, ALL FOUR would fire for every player. Only 2 shown. Content would be suppressed unpredictably.** |

### Day 14 evening detail
| Storylet | Track | Gate |
|----------|-------|------|
| `tuesday_night_study` | belonging | `requires_flag: tuesday_study_group` |
| `tuesday_night_shift` | money | `requires_flag: tuesday_shift` |
| `tuesday_night_terminal` | opportunity | `requires_flag: tuesday_terminal` |
| `tuesday_night_dana_movie` | roommate | `requires_flag: tuesday_dana_movie` |

These are meant to be mutually exclusive (the Tuesday night commitment), but the gating mechanism (`requires_flag`) is NOT enforced by the engine. This is the single biggest risk in the current content.

---

## 4. Gap Identification

### Complete desert days (0 storylets in any segment)
| Day | Impact |
|-----|--------|
| **Day 2** | Player has nothing to do. First "empty" day after dense Day 0-1 onboarding. |
| **Day 3** | Second empty day. Two consecutive empty days feels like the game stopped. |
| **Day 6** | Third empty day. By now routine-week hasn't started yet (Day 7). |

### Track-level gaps
| Track | Active count | Coverage span | Biggest gap | Assessment |
|-------|-------------|---------------|-------------|------------|
| **academic** | 2 | Day 1, Day 8 | **Days 2-7** (6 days) | Critical — player forgets academic track exists |
| **belonging** | 11 | Day 0-14 | Days 2-9 (varies) | Week 2 has good density; Week 1 post-Day-1 is empty |
| **home** | 1 | Day 7 only | **Days 0-6, 8-14** | Critical — single storylet, barely a track |
| **money** | 7 | Day 4, 7, 10, 14 | Days 0-3, 5-6 | Moderate — enters late by design, but long gaps |
| **opportunity** | 4 | Day 0, 1, 5, 14 | Days 2-4, 6-13 | Moderate — Glenn chain is sparse by design, but very gappy |
| **roommate** | 5 | Day 0, 1, 8, 9, 14 | **Days 2-7** (5 days) | Critical — roommate vanishes for nearly a week |

### Segment imbalance
| Segment | Storylets | % of active |
|---------|-----------|-------------|
| Morning | 8 | 27% |
| Afternoon | 10 | 33% |
| Evening | 12 | 40% |

Evening is heaviest, morning lightest. Day 14 evening has a 4-way pileup while Day 14 morning/afternoon are empty.

---

## 5. Preclusion Status

### Existing precludes declarations
Only `evening_choice` choices have `precludes`:

| Choice | Precludes |
|--------|-----------|
| `go_to_party` | `s_d1_evening_cards`, `s_d1_evening_union` |
| `go_to_cards` | `s_d1_evening_party`, `s_d1_evening_union` |
| `go_to_union` | `s_d1_evening_party`, `s_d1_evening_cards` |

**Problem:** The precluded storylet keys (`s_d1_evening_cards`, etc.) do NOT exist in the database. These are phantom references — preclusion would silently do nothing even if the engine enforced it. The actual evening variants are `morning_after_party`, `morning_after_cards`, `morning_after_union`, and they're already gated by `requires_choice`, making preclusion redundant for this case.

### All other choices: empty precludes
Every other terminal choice in the game has `precludes: []`. No storylet is currently precludable. The 30% inaccessibility target (T-018) requires significant preclusion design work.

### What should preclude what (recommendations for T-016)
Preclusion candidates by track:

1. **Tuesday night commitment (Day 14)** — choosing one locks out the other three. This is the clearest preclusion point.
2. **Job selection (job_board → first_shift_*)** — taking one job should preclude the others (and downstream content).
3. **Roommate relationship fork (dana_letter_* Day 9)** — avoidance/surface/connected are mutually exclusive paths. Each should preclude the others AND downstream content.
4. **Academic direction (advisor_visit)** — lean_cs vs lean_humanities should gate different Week 2+ content.
5. **Evening choice (Day 0)** — already has phantom precludes; fix the references and add real downstream impact.

---

## 6. Issues Found

### Critical
| # | Issue | Impact |
|---|-------|--------|
| 1 | **`requires_flag` not enforced by engine** | 11 storylets are "gated" by flags the engine ignores. All would fire for every player. Day 14 evening would show 4 competing ungated storylets. |
| 2 | **Roommate name regression: "Dana" in 5 storylets** | `dana_cereal`, `dana_letter_avoidance`, `dana_letter_surface`, `dana_letter_connected`, `tuesday_night_dana_movie` all use "Dana" — GLOSSARY says roommate is "Scott" (gender audit, 2026-03-24). NPC events reference `npc_roommate_dana`. |
| 3 | **Precludes reference non-existent storylet keys** | `s_d1_evening_cards`, `s_d1_evening_party`, `s_d1_evening_union` don't exist. Preclusion would be a no-op. |
| 4 | **Days 2-3 completely empty** | Player has zero content after dense Day 0-1. Feels like the game broke. |

### Moderate
| # | Issue | Impact |
|---|-------|--------|
| 5 | **Home track has 1 storylet** | `pay_phone_line` on Day 7 evening. Track barely exists. |
| 6 | **Academic gap Days 2-7** | 6-day void between advisor_visit and heller_lecture. |
| 7 | **Roommate gap Days 2-7** | 5-day void. Scott disappears until Day 8. |
| 8 | **5 new NPCs not in HANDOFF registry** | `npc_econ_rebecca`, `npc_librarian_doerr`, `npc_dining_terry`, `npc_grounds_vince`, `npc_roommate_dana` (should be `npc_roommate_scott`) |
| 9 | **Day 14 evening: 4-track collision with no enforced gating** | Without `requires_flag` enforcement, all 4 compete for 2 slots. |

### Low
| # | Issue | Impact |
|---|-------|--------|
| 10 | **HANDOFF.md significantly outdated** | Says 10+ active storylets; there are 30. Says opportunity/home have 0; they have 4/1. |
| 11 | **Morning segment underserved** | Only 27% of content. |

---

## 7. Recommendations

### For T-016 (Runtime Preclusion)
1. **Implement `requires_flag` enforcement first.** 11 storylets depend on it. Without it, preclusion design can't be tested because gating is broken.
2. **Fix phantom precludes** on `evening_choice` — update to reference actual storylet keys (`morning_after_party`, etc.) or remove since `requires_choice` already handles this.
3. **Design preclusion at 5 natural fork points** (see Section 5 above).

### For content planning (T-009: Week 2 content)
Priority fills for the most damaging gaps:

| Priority | Day | Segment | Track | Why |
|----------|-----|---------|-------|-----|
| **P0** | 2 | morning | roommate | Break the desert. Scott re-encounter. |
| **P0** | 2 | afternoon | academic | First class or campus exploration. |
| **P0** | 3 | morning | belonging | Floor dynamics evolve. |
| **P1** | 3 | evening | home | First homesickness beat. Move earlier than Day 7. |
| **P1** | 5 | afternoon | academic | Study session or library encounter. |
| **P1** | 6 | morning | roommate | Pre-routine-week roommate moment. |
| **P2** | 4 | morning | belonging | Extend floor social dynamics. |
| **P2** | 6 | evening | belonging | Pre-routine social event. |

### For the Dana/Scott naming issue
This is T-1776329281010 (gender audit). The 5 affected storylets need:
- Rename storylet keys: `dana_*` → `scott_*` (or new keys)
- Update body text: "Dana" → "Scott"
- Update NPC references: `npc_roommate_dana` → `npc_roommate_scott`
- Update `requires_choice`/`requires_flag` references if choice IDs change

---

## 8. Track-by-Track Detail

### Academic (2 active)
```
Day 1  afternoon  advisor_visit      POOL  ungated     → track entry
Day 8  morning    heller_lecture      POOL  ungated     → first class
                  [GAP: Days 2-7, Days 9-14]
```

### Belonging (11 active)
```
Day 0  morning    dorm_hallmates      CHAIN start      → lunch_floor
Day 0  afternoon  lunch_floor         CHAIN             → evening_choice
Day 0  evening    evening_choice      CHAIN end         → 3-way fork (party/cards/union)
Day 1  morning    morning_after_*     POOL  gated       → 1 of 3 fires (requires_choice)
Day 10 afternoon  miguel_guitar       POOL  ungated
Day 11 afternoon  priya_dining_hall   POOL  ungated
Day 12 evening    doug_coach_story    POOL  ungated
Day 13 evening    tuesday_commitment  POOL  ungated
Day 14 evening    tuesday_night_study POOL  flag-gated  → requires_flag: tuesday_study_group
                  [GAP: Days 2-9]
```

### Home (1 active)
```
Day 7  evening    pay_phone_line      POOL  ungated     → track entry, sole storylet
                  [GAP: Days 0-6, Days 8-14]
```

### Money (7 active)
```
Day 4  evening    money_reality_check POOL  ungated     → track entry
Day 7  afternoon  job_board           POOL  ungated     → 4-way job fork
Day 10 morning    first_shift_grounds POOL  flag-gated  → requires_flag: has_job_grounds
Day 10 morning    first_shift_dining  POOL  flag-gated  → requires_flag: has_job_dining
Day 10 afternoon  first_shift_research POOL flag-gated  → requires_flag: has_job_research
Day 10 evening    first_shift_library POOL  flag-gated  → requires_flag: has_job_library
Day 14 evening    tuesday_night_shift POOL  flag-gated  → requires_flag: tuesday_shift
                  [GAP: Days 0-3, 5-6, 8-9, 11-13]
```

### Opportunity (4 active)
```
Day 0  afternoon  glenn_pastime_paradise  POOL  ungated → Glenn encounter
Day 1  afternoon  terminal_first_visit    POOL  flag-gated → requires_flag: glenn_gave_direction
Day 5  morning    glenn_the_walk          POOL  flag-gated → requires_flag: found_terminal
Day 14 evening    tuesday_night_terminal  POOL  flag-gated → requires_flag: tuesday_terminal
                  [GAP: Days 2-4, 6-13]
```

### Roommate (5 active)
```
Day 0  morning    room_214                CHAIN start    → first_morning
Day 1  morning    first_morning           CHAIN end
Day 8  evening    dana_cereal             POOL  ungated  → NAME BUG
Day 9  evening    dana_letter_avoidance   POOL  flag-gated → requires_flag: dana_cereal_cold
Day 9  evening    dana_letter_surface     POOL  ungated
Day 9  evening    dana_letter_connected   POOL  choice-gated → requires_choice: real_question
Day 14 evening    tuesday_night_dana_movie POOL flag-gated → requires_flag: tuesday_dana_movie
                  [GAP: Days 2-7, Days 10-13]
```

---

## 9. Preclusion Math (T-018 prep)

For 30% inaccessibility, roughly 9 of 30 active storylets must be unreachable per run.

Current state: **0% inaccessibility.** The only gating is `requires_choice` on 3 morning-after variants (only 1 fires, so 2 are inaccessible = 7%). All other "gates" use `requires_flag` which is unenforced.

To reach 30%:
- Tuesday night 4-way commitment: 3 precluded per run (+10%)
- Job selection 4-way: 3 precluded per run (+10%)
- Roommate letter 3-way: 2 precluded per run (+7%)
- Evening choice morning-after: 2 precluded per run (already at 7%)

That gets to ~34% — achievable with the existing fork points once preclusion and `requires_flag` are enforced.
