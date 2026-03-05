# /docs/NPC_SYSTEM.md
# NPC System – Year One (1983)
# College Arc: Full NPC Roster, Memory Model, and Storyline Map

---

## Overview

NPCs in Year One operate on three principles:

1. **Memory over metrics** — NPCs remember what you did, not a number.
2. **Consequence delay** — Most relational effects surface a day or two later.
3. **Bounded roster** — Year One has 8 named NPCs. Not more.

Each NPC has a defined role, a memory state, and a set of storylines they anchor.

---

## NPC Memory Model

Every NPC carries this state in `relationships` (stored in `daily_states.relationships` as JSONB):

```json
{
  "npc_key": {
    "trust": 0,
    "reliability": 0,
    "emotionalLoad": 0,
    "met": false,
    "events": []
  }
}
```

### Field Definitions

| Field | Range | Meaning |
|---|---|---|
| `trust` | -3 to +3 | How much they open up / rely on you |
| `reliability` | -3 to +3 | Whether they count on you |
| `emotionalLoad` | 0 to 3 | How much they're leaning on you emotionally |
| `met` | bool | Have you been introduced? |
| `events` | string[] | List of event types (e.g. `REPAIR_ATTEMPT`, `CONFLICT_LOW`) |

### Event Types (canonical)

```
INTRODUCED_SELF
OVERHEARD_NAME
NOTICED_FACE
SMALL_KINDNESS
AWKWARD_MOMENT
REPAIR_ATTEMPT
CONFLICT_LOW
CONFLICT_HIGH
DEFERRED_TENSION
SHOWED_UP
WENT_MISSING
CONFIDED_IN
DISMISSED
```

---

## Year One NPC Roster

### 1. Dana — The Roommate
**Key:** `npc_roommate_dana`
**Role:** Immediate relational mirror. Your first real test.
**Pillar tested:** Belonging, Confront vs Avoid
**Introduced:** Day 1, s1_dorm_wake_dislocation

Dana is organized, slightly guarded, and observing you closely. She's not cold — she's cautious. She wants to know if you're someone she can trust in a small shared space.

**What she notices:**
- Did you show up when you said you would?
- Did you address tension or deflect it?
- Did you acknowledge her or treat her as backdrop?

**Storylines she anchors:**
- `roommate_tension_week1` (Days 1–3)
- `roommate_study_habits` (Week 2)
- `roommate_late_night_talk` (Week 3, trust-gated)

---

### 2. Miguel — The Connector
**Key:** `npc_connector_miguel`
**Role:** Social gateway. Knows everyone. Moves fast.
**Pillar tested:** Risk vs Safety, People vs Achievement
**Introduced:** Day 1, s2_hall_phone / s3_dining_hall

Miguel is easy. That's the thing about him — he makes social life look frictionless. He pulls people in by being loud and warm and slightly reckless. You'll either track with him or lose him early.

**What he notices:**
- Did you introduce yourself or wait?
- Did you show up to the social?
- Did you answer the phone and say his name?

**Storylines he anchors:**
- `miguel_party_invite` (Day 3–5)
- `miguel_study_favor` (Week 2, reliability-gated)
- `miguel_conflict_loyalty` (Week 4, trust-dependent branch)

---

### 3. Professor Marsh — The First Academic Authority
**Key:** `npc_prof_marsh`
**Role:** First professor to notice you. English or Sociology.
**Pillar tested:** Achievement vs People, Courage
**Introduced:** Day 2 (first class)

Marsh is not a villain and not a mentor. He's tired and precise and occasionally brilliant. He gives you the first real chance to speak in class — and notices whether you take it.

**What he notices:**
- Did you have the book on Day 2?
- Did you speak up in discussion?
- Did you come to office hours?

**Storylines he anchors:**
- `first_class_no_textbook` (Day 2)
- `marsh_office_hours` (Week 2)
- `marsh_paper_grade` (Week 4)

---

### 4. Priya — The Studious One
**Key:** `npc_studious_priya`
**Role:** Study partner candidate. High competence, low social ease.
**Pillar tested:** Achievement, Craft
**Introduced:** Day 2 (class or library, Week 1)

Priya is already two chapters ahead. She sits near the front, doesn't make small talk easily, but if you sit next to her and say something non-stupid about the reading, a door opens.

**What she notices:**
- Did you do the reading?
- Did you approach her or wait for her to invite you?
- Did you flake on the study group?

**Storylines she anchors:**
- `study_group_form` (Week 2)
- `priya_late_night_cram` (Week 3)
- `priya_ethical_dilemma` (Week 4 — she asks you something that has no good answer)

---

### 5. Cal — The Floor Wildcard
**Key:** `npc_floor_cal`
**Role:** The guy on your floor who never sleeps and is always fun and slightly dangerous.
**Pillar tested:** Risk vs Safety
**Introduced:** Day 1 (floor meeting or hall)

Cal is not trying to be a bad influence. He just has zero governor on impulse. He knocks on your door at 11pm. He has opinions about everything. He'll be someone's best memory of freshman year, and someone's worst.

**What he notices:**
- Did you open your door when he knocked?
- Did you go along or hold a line?
- Did you cover for him when something went sideways?

**Storylines he anchors:**
- `cal_midnight_knock` (Day 2–4)
- `cal_party_spiral` (Week 3)
- `cal_incident` (Week 4–5, risk-dependent)

---

### 6. Jordan — The Ambiguous One
**Key:** `npc_ambiguous_jordan`
**Role:** Romantic possibility, friend, or rival depending on your choices.
**Pillar tested:** Love, Courage, Belonging
**Introduced:** Week 1 orientation event or through Miguel

Jordan is hard to read on purpose. Quiet sometimes, sharp sometimes. Notices things. Doesn't always say what they're thinking. They'll mean something different to different playthroughs.

**What they notice:**
- Did you remember something they said?
- Did you pursue or wait?
- Did you ask about them or talk about yourself?

**Storylines they anchor:**
- `jordan_orientation_intro` (Day 1–2)
- `jordan_first_real_talk` (Week 2, trust-gated)
- `jordan_ambiguous_moment` (Week 3)
- `jordan_branch_decision` (Week 4 — friendship, romance, or distance)

---

### 7. The RA — Sandra
**Key:** `npc_ra_sandra`
**Role:** Institutional presence. Fair but watching.
**Pillar tested:** Authority, Integrity
**Introduced:** Day 1 (floor meeting)

Sandra runs the floor meeting. She is exactly what you'd expect: prepared, slightly weary, genuinely trying. She will matter later if something goes wrong on the floor. She's not a threat — she's a variable.

**What she notices:**
- Did you show up to the floor meeting?
- Did you cause or resolve a problem?
- Did you come to her with something before it escalated?

**Storylines she anchors:**
- `floor_meeting_day1` (Day 1)
- `sandra_warning_cal` (Week 3, triggered by cal_incident)
- `sandra_conversation` (Week 4–5, integrity-tested)

---

### 8. Parent(s) — Voice on the Dorm Phone
**Key:** `npc_parent_voice`
**Role:** Off-screen pressure. Check-in calls. Emotional residue.
**Pillar tested:** Autonomy, Identity
**Introduced:** Day 3–4 (dorm phone)

Your parent(s) call. The call is short. It matters anyway. What you say — and what you don't say — shapes the self-concept you're building.

**What this tracks:**
- Did you tell them how things actually are?
- Did you perform okay-ness?
- Did you ask for something or handle it yourself?

**Storylines anchored:**
- `parent_check_in_week1` (Day 3–4)
- `parent_call_week3` (Week 3 — something has changed)

---

## NPC Relationship Rules

### Trust Thresholds

| trust value | Effect |
|---|---|
| +2 or above | NPC offers extended dialogue; confides something |
| +1 | Normal positive relationship |
| 0 | Neutral; default |
| -1 | Cooler; shorter responses; less available |
| -2 or below | NPC pulls back; certain storylines become unavailable |

### Reliability Thresholds

| reliability | Effect |
|---|---|
| +2 | NPC asks you for something important |
| 0 | Normal |
| -2 | NPC stops inviting you; stops assuming you'll show |

### EmotionalLoad

| emotionalLoad | Effect |
|---|---|
| 0–1 | Normal |
| 2 | NPC is leaning on you; some choices cost more energy |
| 3 | NPC crisis event becomes available (or unavoidable) |

---
