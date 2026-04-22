# MMV Content Inventory

> Regenerated 2026-04-22 by querying Supabase directly. Source of truth is the DB.
> Detailed per-track chains live in `docs/CHAIN-MAP.md`.

---

## Summary

| Item | Count |
|------|-------|
| **Active storylets** | 45 |
| **Inactive storylets** | 4 |
| **Tracks with content** | 6 of 7 (Echoes/time-travel frame still reserved) |
| **Day span** | Day 0 → Day 14 |
| **NPCs introduced across active storylets** | 15 unique (see roster below) |
| **Mini-games wired** | 3 (caps, memory, snake — all in `evening_choice`) |

### Storylet count by track

| Track | Active |
|-------|--------|
| academic | 7 |
| belonging | 14 |
| home | 1 |
| money | 8 |
| opportunity | 5 |
| roommate | 10 |

---

## Coverage by Day

| Day | Slots filled (track × segment) |
|-----|--------------------------------|
| 0 | roommate morning, belonging morning/afternoon/evening, academic morning, opportunity afternoon |
| 1 | roommate morning, academic afternoon, belonging morning (×3 variants), opportunity afternoon |
| 2 | roommate morning, academic morning/evening, belonging afternoon, money afternoon |
| 3 | roommate evening, academic morning/afternoon/evening, belonging morning/afternoon |
| 4 | money evening |
| 5 | opportunity morning |
| 7 | money afternoon, home evening |
| 8 | roommate evening, academic morning |
| 9 | roommate evening (×3 variants) |
| 10 | belonging afternoon, money morning/afternoon/evening (×4 job variants) |
| 11 | roommate evening, belonging afternoon |
| 12 | belonging evening |
| 13 | belonging evening (tuesday_commitment hub) |
| 14 | roommate/money/opportunity evening (×3 tuesday_night variants), opportunity afternoon |

Days 6 is unfilled. Days 4 and 5 are sparse (one storylet each). Primary content
density is Days 0–3 (orientation) and Days 10–14 (Week 2).

---

## NPC Introductions (from storylet.introduces_npc)

| Storylet | Day/Segment | NPCs introduced |
|----------|-------------|-----------------|
| `room_214` | Day 0 morning | npc_roommate_dana |
| `dorm_hallmates` | Day 0 morning | npc_floor_doug, npc_floor_mike, npc_floor_keith |
| `glenn_pastime_paradise` | Day 0 afternoon | npc_contact_glenn |
| `evening_choice` | Day 0 evening | npc_anderson_bryce |
| `morning_after_cards` | Day 1 morning | npc_floor_peterson |
| `western_civ_day1` | Day 2 morning | npc_prof_western_civ |
| `first_shift_dining` | Day 10 morning | npc_dining_terry |
| `first_shift_grounds` | Day 10 morning | npc_grounds_vince |
| `first_shift_research` | Day 10 afternoon | npc_econ_rebecca |
| `first_shift_library` | Day 10 evening | npc_librarian_doerr |
| `heller_lecture` | Day 8 morning | npc_prof_heller, npc_ta_tomas |
| `tuesday_night_study` | Day 14 evening | npc_study_wes |

Canonical registry: `docs/NPC_DATA_REFERENCE.md`. Every NPC named in body text
should have an introduction in the first storylet that names them.

---

## Mini-Games Wired

| Storylet | Choice | Mini-game |
|----------|--------|-----------|
| `evening_choice` | `go_to_party` | caps |
| `evening_choice` | `go_to_cards` | memory |
| `evening_choice` | `go_to_union` | snake |

Additional mini-games defined in `docs/MINI_GAME_DESIGN.md` but not yet wired
to storylets: sorting (bartender skin), more TBD.

---

## Content Gaps

- **Home track** has only one storylet (`pay_phone_line`, Day 7 evening). No Day 3–4 parent call, no follow-up beats.
- **Day 6** is empty across all tracks.
- **Days 4 and 5** are sparse. Week 1 mid-week needs fill-in.
- **Week 3+** (Day 15+) is entirely unbuilt.

---

## Disabled Storylets (design-stage or superseded)

| Slug | Track | Reason |
|------|-------|--------|
| `hall_morning` | belonging | superseded by `morning_after_*` variants |
| `orientation_fair` | belonging | design-stage |
| `cal_midnight_knock` | belonging | design-stage |
| `roommate_moment` | roommate | design-stage |

---

*Regenerate this file with the queries at the bottom of `docs/CHAIN-MAP.md`
plus:*
```sql
SELECT storylet_key, introduces_npc FROM storylets
  WHERE is_active AND array_length(introduces_npc, 1) > 0;

SELECT s.storylet_key, c->>'id', c->'mini_game'->>'type'
  FROM storylets s CROSS JOIN LATERAL jsonb_array_elements(s.choices) c
  WHERE s.is_active AND c ? 'mini_game';
```
