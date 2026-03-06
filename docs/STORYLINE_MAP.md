# /docs/STORYLINE_MAP.md
# Storyline Map – Year One (1983)
# Week-by-week arc structure for the college chapter

---

## Structural Rules

- Each week has 3 playable days (morning / afternoon / evening slots)
- At least one opportunity **expires** per week
- Each week surfaces **one relational consequence** from the prior week
- Déjà vu beats appear **at least once per week**, always subtle
- The reflection engine runs at **end of week** (not end of day)

---

## Week 0: Arrival (Pre-play / Residue)

Not playable. Emotional backstory only.

**What happened:**
- Parents dropped you off. Boxes were unpacked awkwardly.
- Goodbye was heavier than expected.
- Dana arrived and the room got real.

**Seeds planted:**
- `parent_goodbye_weight` — referenced in parent call Week 1
- `dorm_feels_known` — first déjà vu anchor

---

## Week 1: First Week (Days 1–5)

### Core Arc: `arc_one_core`

**Storylets (already seeded):**
- `s1_dorm_wake_dislocation` — Day 1 morning
- `s2_hall_phone` — Day 1 morning/hall
- `s3_dining_hall` — Day 1 morning
- `s4_midday_choice` — Day 1 afternoon (bookstore vs. social)
- `s5_roommate_tension` — Day 1 evening
- `s6_day2_consequence` — Day 2 morning

**New storylets needed (Week 1):**

| Slug | Day | Slot | Anchors | Tags |
|---|---|---|---|---|
| `s7_first_class` | Day 2 | Morning | prof_marsh | achievement, safety |
| `s8_floor_meeting` | Day 1 | Evening | ra_sandra, cal | confront, avoid |
| `s9_orientation_fair` | Day 1 | Afternoon | jordan, miguel | risk, people |
| `s10_parent_call_w1` | Day 3–4 | Evening | parent_voice | identity, autonomy |
| `s11_cal_midnight` | Day 2–3 | Evening | cal | risk, safety |

**Opportunities that expire:**
- Bookstore line (`s4_midday_choice` → `bookstore_line`) — if skipped, Day 2 class is harder
- Orientation fair — if skipped, Jordan introduction is delayed to Week 2 or missed

**Week 1 reflection inputs:**
- Identity tags accumulated
- `npc_roommate_dana.reliability` delta
- `npc_connector_miguel.trust` delta
- Whether bookstore was completed
- Energy level at end of Day 2

---

## Week 2: Settling In (Days 6–10)

**Theme:** Commitments start forming. The shape of your days becomes visible.

**Core tension:** You can't do everything. Something is already slipping.

### Storylets needed:

| Slug | Day | Slot | Anchors | Tags |
|---|---|---|---|---|
| `s12_study_group_invite` | Day 6 | Afternoon | priya | achievement, people |
| `s13_miguel_party_invite` | Day 7 | Evening | miguel | risk, safety |
| `s14_marsh_office_hours` | Day 8 | Afternoon | prof_marsh | achievement, confront |
| `s15_dana_small_conflict` | Day 9 | Evening | dana | confront, avoid |
| `s16_jordan_first_talk` | Day 9–10 | Afternoon | jordan | people, courage |
| `s17_campus_job_table` | Day 7 | Afternoon | — | money, achievement |

**Gates:**
- `s12_study_group_invite` requires: `npc_studious_priya.met = true` OR `s7_first_class` completed
- `s14_marsh_office_hours` available only if `s7_first_class` ran (even if book was missing)
- `s16_jordan_first_talk` requires: met at orientation OR `npc_connector_miguel.trust >= 1`

**Opportunities that expire:**
- Campus job table (`s17`) — only available Days 6–8; closes after
- Study group invite (`s12`) — if deferred twice, Priya forms it without you

**Week 2 reflection inputs:**
- Money band shift (if job was taken)
- Skill pattern: did you study or socialize?
- `npc_connector_miguel.trust` trajectory
- `npc_roommate_dana.trust + reliability` combined

---

## Week 3: Pressure Mounts (Days 11–15)

**Theme:** First real costs appear. The choices from Weeks 1–2 surface as consequences.

**Core tension:** Something from Week 1 or 2 is now a problem. You can address it or let it compound.

### Storylets needed:

| Slug | Day | Slot | Anchors | Tags |
|---|---|---|---|---|
| `s18_cal_party_spiral` | Day 11 | Evening | cal | risk, safety, confront |
| `s19_priya_late_night_cram` | Day 12 | Evening | priya | achievement, people |
| `s20_parent_call_w3` | Day 13 | Evening | parent_voice | identity, autonomy |
| `s21_jordan_ambiguous_moment` | Day 13–14 | Afternoon | jordan | love, courage |
| `s22_dana_deferred_surfaces` | Day 14 | Evening | dana | confront, avoid |
| `s23_marsh_paper_due` | Day 15 | Morning | prof_marsh | achievement, integrity |

**Conditional logic:**
- `s22_dana_deferred_surfaces` only triggers if `set_flags.deferred_roommate_tension = true` from `s5`
- `s18_cal_party_spiral` intensity scales with `npc_floor_cal.trust` — if high, you're pulled in deeper
- `s23_marsh_paper_due` outcome modified by: did you attend office hours? did you have the book?

**Déjà vu beat required:**
- In `s21_jordan_ambiguous_moment`: player predicts a gesture Jordan makes before it happens

**Opportunities that expire:**
- Repairing Dana relationship requires addressing by Day 14; after that, the distance sets

**Week 3 reflection inputs:**
- Relational state of Dana (trust + reliability)
- Cal's trajectory (did you follow or hold a line?)
- Paper outcome (success/struggle/fail)
- Energy level (were you running thin by week end?)

---

## Week 4: Definition (Days 16–21)

**Theme:** By now, a shape is forming. You are becoming someone. The question is whether you like who.

**Core tension:** A choice between what you want and what you've committed to.

### Storylets needed:

| Slug | Day | Slot | Anchors | Tags |
|---|---|---|---|---|
| `s24_jordan_branch_decision` | Day 16–17 | Afternoon | jordan | love, belonging, courage |
| `s25_miguel_conflict_loyalty` | Day 17–18 | — | miguel | integrity, people |
| `s26_sandra_warning_cal` | Day 18 | — | ra_sandra, cal | authority, integrity |
| `s27_priya_ethical_dilemma` | Day 19 | — | priya | integrity, achievement |
| `s28_financial_moment` | Day 18–20 | — | — | money, achievement, safety |
| `s29_week4_reflection_trigger` | Day 21 | — | — | — |

**`s24_jordan_branch_decision` branches:**
- Friendship path (low courage investment, safe)
- Romantic pursuit path (requires trust >= 1 + courage tags)
- Avoidance / distance path (fallback)

**`s25_miguel_conflict_loyalty` triggers if:**
- `npc_connector_miguel.trust >= 1` AND `npc_roommate_dana.trust >= 1`
- Miguel and Dana are in conflict; you have to choose a side or navigate it

**`s27_priya_ethical_dilemma`:**
- Priya finds something. She asks what you think she should do.
- Your answer is identity-defining. No "correct" answer.
- Tracks: integrity tag pattern

**`s28_financial_moment`:**
- If `moneyBand = Tight`: a small crisis (textbook cost, unexpected fee)
- If job was taken: a scheduling conflict with something social
- If `moneyBand = Comfortable`: a choice about what to spend on

**Week 4 reflection (Arc End):**

Full reflection engine fires. Outputs:
- Identity pattern summary (2–3 dominant tags)
- What slipped (time / relationships / academic)
- Energy pattern
- One relational line per NPC with delta >= |2|
- One structural tradeoff observation
- Replay intention prompt

---

## Storylet Design Rules

Every new storylet must include:

```json
{
  "id": "choice_key",
  "label": "...",
  "targetStoryletId": "next_slug",
  "time_cost": 0,
  "energy_cost": 0,
  "identity_tags": [],
  "relational_effects": {},
  "events_emitted": [],
  "reaction_text": null,
  "reaction_text_conditions": []
}
```

**Required per storylet:**
- At least one choice with `identity_tags` populated
- At least one choice that creates a relational effect
- One choice that is purely avoidant (always available)
- Body prose set in 1983 physical detail (see setting.md anchors)

**Déjà vu beats:**
- Tag the storylet with `deja_vu` when the beat is present
- Keep the beat in the **body prose**, not the choice text
- Maximum one per storylet

---

## Branching Summary

```
Day 1
  s1 (dorm wake) → s2 (hall phone) → s3 (dining hall)
                                          ↓
                                    s4 (midday choice)
                                          ↓
                                    s5 (roommate tension)
                                          ↓
Day 2                               s6 (consequence)
                                          ↓
                                    s7 (first class)
                                    s8 (floor meeting)  ← parallel Day 1 evening
                                    s9 (orientation)    ← parallel Day 1 afternoon
Week 2
  s12–s17 (unlocks depend on Week 1 choices)
Week 3
  s18–s23 (consequences of Week 2 + conditional flags)
Week 4
  s24–s29 (definition + arc reflection)
```

---

## NPC Appearance Schedule

| NPC | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|
| Dana | s1, s5, s6 | s15 | s22 | s25 (indirect) |
| Miguel | s2, s3, s4 | s13 | — | s25 |
| Prof. Marsh | s7 | s14 | s23 | — |
| Priya | — | s12 | s19 | s27 |
| Cal | s8, s11 | — | s18 | s26 |
| Jordan | s9 | s16 | s21 | s24 |
| Sandra (RA) | s8 | — | — | s26 |
| Parent | s10 | — | s20 | — |

---
