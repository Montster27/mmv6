<!-- /docs/briefs/SCOTT_DAY2_MORNING_BRIEF.md -->
<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/briefs/ folder in MMV repo -->
<!-- ///////////////////////////////////////////// -->

# Scott Day 2 Morning — Content Brief for Code
> **Purpose:** Complete prose, node structure, and system effects for 1 storylet.
> Code session turns this into a SQL migration.
> **Date:** 2026-04-17
> **Design context:** First storylet to fill the Days 2-3 content desert.
> First storylet that proves Day 0 roommate choices had consequences.

---

## Storylet: `scott_day2_morning`

### Metadata
```yaml
slug: scott_day2_morning
title: Room 214, Morning
track: roommate
storylet_key: scott_day2_morning
segment: morning
due_offset_days: 2
expires_after_days: 7
time_cost_hours: 0
is_active: true
introduces_npc: []
default_next_key: null
tags: ["roommate", "orientation", "day2"]
requirements: {}
weight: 100
```

### Body (Preamble) — THREE VARIANTS

The preamble varies by Scott's current trust level. Code should implement
this as conditional body text using a `condition` path expression on
`relationships.npc_roommate_scott.trust`, OR as the entry node text with
a conditional branch. Whichever pattern matches existing engine support.

**Implementation note:** If the engine doesn't currently support conditional
body text, use the node system instead — make the entry node a router that
checks trust and branches to the appropriate opening. The node approach
is preferred anyway since we're using conversational nodes throughout.

**VARIANT A — trust ≥ 2 (player chose "real" conversation on Day 0)**
```
Scott is already up. His side of the room looks different — photos tacked
to the corkboard above his desk. A family on a porch. A dog in a yard
that's mostly gravel. A poster of a car you don't recognize, something
with a long hood and chrome bumpers.

He's eating cereal straight from the box. No bowl. Just reaching in
like a kid watching Saturday cartoons, except there's no TV and it's
Wednesday.

He looks up when you move. Not startled. Like he was waiting for you
to wake up and now you have.
```

**VARIANT B — trust 0-1 (player chose "surface" or mild "desk" on Day 0)**
```
Scott is at his desk. Textbook open but he's staring at the wall above
it where there's nothing to stare at yet. When you shift in bed he
turns around — slightly startled, like he forgot he has a roommate.

His side of the room is still sparse. A few things unpacked but
nothing on the walls. The box under his bed hasn't moved since
move-in day, still taped shut.

He turns back to the desk. Then, over his shoulder, not quite looking
at you:
```

**VARIANT C — trust < 0 (player was aggressive about the desk on Day 0)**
```
Scott's bed is made. Made carefully — hospital corners, pillow centered.
His side of the room is neat in a way that feels like a statement,
every object placed with the precision of someone drawing a border.

He's not here. His backpack is gone. On his desk, a folded piece of
paper. The handwriting is careful, each letter formed separately:
"Gone to breakfast."

The Pretenders tape is on his desk. He's rewound it to the beginning.
```

---

### Nodes

```json
[
  {
    "id": "entry_warm",
    "text": "\"Hey.\" He brushes cereal dust off his hands. \"How was last night?\"\n\nHe's asking because he wants to know. You can tell because he stopped eating.",
    "speaker": "npc_roommate_scott",
    "condition": { "path": "relationships.npc_roommate_scott.trust", "gte": 2 },
    "micro_choices": [
      {
        "id": "tell_him_about_night",
        "label": "Tell him about it — the party, the cards, whatever happened",
        "next": "warm_engaged",
        "sets_flag": "shared_night"
      },
      {
        "id": "keep_it_short_warm",
        "label": "\"It was good. You should've come.\"",
        "next": "warm_brief",
        "sets_flag": "was_brief"
      }
    ]
  },
  {
    "id": "entry_neutral",
    "text": "\"Oh. Hey.\"\n\nA beat. He looks at you, then at the window, then back.\n\n\"You going to breakfast?\"",
    "speaker": "npc_roommate_scott",
    "condition": { "path": "relationships.npc_roommate_scott.trust", "gte": 0, "lt": 2 },
    "micro_choices": [
      {
        "id": "yeah_lets_go",
        "label": "\"Yeah. You want to go?\"",
        "next": "neutral_invited",
        "sets_flag": "invited_scott"
      },
      {
        "id": "in_a_bit",
        "label": "\"In a bit.\"",
        "next": "neutral_solo",
        "sets_flag": "was_brief"
      }
    ]
  },
  {
    "id": "entry_absent",
    "text": "You read the note again. The handwriting is careful. \"Gone to breakfast\" — not \"went to breakfast\" or \"at dining hall.\" Gone. Like he wanted you to know he chose to leave.\n\nThe room is yours. It's quiet in a way that feels earned. You're not sure by whom.",
    "condition": { "path": "relationships.npc_roommate_scott.trust", "lt": 0 },
    "micro_choices": [
      {
        "id": "look_at_his_stuff",
        "label": "Look at the photos he hasn't put up yet",
        "next": "absent_looked",
        "sets_flag": "looked_at_stuff"
      },
      {
        "id": "just_leave",
        "label": "Get dressed. Head out.",
        "next": "absent_left",
        "sets_flag": "was_brief"
      }
    ]
  },
  {
    "id": "warm_engaged",
    "text": "You tell him. Not everything — not the part where you stood in the hallway for thirty seconds deciding whether to go back to the room — but the shape of it. Who was there. What the music was like. How weird it is to be surrounded by strangers who are all pretending not to be strangers.\n\nScott listens. Actually listens — not waiting for his turn, not checking the clock. When you finish, he nods.\n\n\"I stayed in. Read for a while. Fell asleep around eleven.\" A pause. \"I should've gone somewhere.\"",
    "speaker": "npc_roommate_scott",
    "micro_choices": [
      {
        "id": "next_time",
        "label": "\"Come next time. I'll knock before I leave.\"",
        "next": "warm_offered",
        "sets_flag": "offered_next_time"
      },
      {
        "id": "its_fine",
        "label": "\"Reading's not bad. Quieter.\"",
        "next": "warm_validated",
        "sets_flag": "validated_staying_in"
      }
    ]
  },
  {
    "id": "warm_brief",
    "text": "He nods. Reaches back into the cereal box.\n\n\"Yeah. Maybe next time.\" He says it the way people say things they half mean. The conversation finds its natural floor and sits there — not awkward, not warm, just two people in a room who haven't figured out the rhythm yet.",
    "next": "choices"
  },
  {
    "id": "warm_offered",
    "text": "Something shifts in his face. Not a smile exactly — more like a muscle relaxing that had been tensed.\n\n\"Yeah. Okay.\" He puts the cereal box on the desk, brushes his hands on his jeans. \"You want to go get real breakfast? The dining hall's supposed to have eggs on Wednesdays.\"",
    "speaker": "npc_roommate_scott",
    "next": "choices"
  },
  {
    "id": "warm_validated",
    "text": "He looks at you for a second like he's deciding whether you mean it.\n\n\"I used to share a room with my brother. He went out every night. I read every night. Worked fine until it didn't.\" He stops himself. Shakes the cereal box — almost empty. \"Anyway. Breakfast?\"",
    "speaker": "npc_roommate_scott",
    "next": "choices"
  },
  {
    "id": "neutral_invited",
    "text": "He looks mildly surprised. Like the invitation was possible but not expected.\n\n\"Sure. Give me a minute.\" He closes the textbook — thermodynamics, the cover bent at the corner like he's been carrying it around without a bag. Puts on sneakers without untying them.\n\nYou wait by the door. It's not a long wait but you're aware of it. Two people learning how to leave a room together.",
    "next": "choices"
  },
  {
    "id": "neutral_solo",
    "text": "\"Okay.\" He goes back to the textbook. The page doesn't turn.\n\nYou get dressed. The silence has a texture — not hostile, not comfortable. The texture of two people who share a space but haven't decided what that means.\n\nHe's still at the desk when you pick up your backpack.",
    "next": "choices"
  },
  {
    "id": "absent_looked",
    "text": "The box under his bed is still taped. But on his desk, tucked behind the textbook, a strip of photos from a booth. Scott and a girl — sister maybe, the same chin — making faces in four frames. In the last one they're both laughing at something outside the booth.\n\nHe carried these from Ohio. Hasn't put them up. Hasn't put anything up. You wonder if the room doesn't feel like his yet, or if he doesn't want it to.",
    "next": "choices"
  },
  {
    "id": "absent_left",
    "text": "You get dressed fast. The note sits on his desk. You don't write one back.\n\nThe hallway smells like industrial cleaner and someone else's shampoo. Two doors down, someone's alarm is still going off. Nobody's turning it off.",
    "next": "choices"
  }
]
```

### Terminal Choices

```json
[
  {
    "id": "breakfast_with_scott",
    "label": "Head to the dining hall with Scott",
    "requires_flag": ["shared_night", "offered_next_time", "validated_staying_in", "invited_scott"],
    "requires_flag_mode": "any",
    "excludes_flag": ["was_brief", "looked_at_stuff"],
    "time_cost": 1,
    "energy_cost": 0,
    "identity_tags": ["people"],
    "reaction_text": "You walk to the dining hall together. Scott points out a shortcut through the science building he found yesterday while you were somewhere else. The dining hall is loud and fluorescent and you get trays and sit at the end of a long table without discussing it. The eggs are powdered. The coffee tastes like it was made by someone who has heard of coffee but never tasted it. Scott eats like someone who doesn't think about food, mechanical and thorough. Neither of you talks much. It's okay.",
    "outcome": {
      "text": "",
      "deltas": {}
    },
    "events_emitted": [
      { "npc_id": "npc_roommate_scott", "type": "SHARED_MEAL", "magnitude": 1 },
      { "npc_id": "npc_roommate_scott", "type": "SHOWED_UP", "magnitude": 1 }
    ]
  },
  {
    "id": "head_out_alone",
    "label": "Grab your stuff and head out",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": [],
    "reaction_text": "You pick up your backpack. The room is small enough that leaving it changes the air pressure. Scott says \"see ya\" or the note says \"gone to breakfast\" or nobody says anything at all, depending on the morning you've had. The door closes behind you and the hallway is bright and the day is starting and you're in it now.",
    "outcome": {
      "text": "",
      "deltas": {}
    },
    "events_emitted": [
      { "npc_id": "npc_roommate_scott", "type": "DEFERRED_TENSION", "magnitude": 0.5 }
    ]
  },
  {
    "id": "read_note_leave",
    "label": "Read Scott's note one more time, then leave",
    "requires_flag": ["looked_at_stuff"],
    "requires_flag_mode": "any",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": [],
    "sets_flag": "read_scotts_note",
    "reaction_text": "You pick up the note. Hold it for a second. The handwriting is patient — each letter formed like he was taught cursive and rejected it, choosing print instead, choosing clarity. \"Gone to breakfast.\" Three words that carry the weight of a decision to leave before you woke up. You put it back where you found it, exactly where he left it, and you go.",
    "outcome": {
      "text": "",
      "deltas": {}
    },
    "events_emitted": []
  }
]
```

---

## Implementation Notes for Code

### 1. Conditional Entry Nodes

This storylet has THREE possible entry nodes based on Scott's trust level.
Implementation options (Code picks the cleanest):

**Option A — Router node:** First node is invisible, has no text, just
evaluates `relationships.npc_roommate_scott.trust` and branches:
- `trust >= 2` → `entry_warm`
- `trust >= 0 AND trust < 2` → `entry_neutral`
- `trust < 0` → `entry_absent`

**Option B — Single entry with conditional text:** One `entry` node with
three text variants gated by condition. Simpler if the engine supports it.

**Option C — Three pool variants:** Split into three storylets
(`scott_day2_morning_warm`, `scott_day2_morning_neutral`,
`scott_day2_morning_absent`) with `condition` requirements on each.
Heaviest but most compatible with existing engine.

**Recommendation:** Option A if the node system can do it. Option C if
not — it matches the `morning_after_*` pattern already in production.

### 2. Terminal Choice Gating

`breakfast_with_scott` uses `requires_flag_mode: "any"` — the player needs
ANY ONE of the engagement flags, not all. This means: if you told him about
your night, OR offered to knock next time, OR validated his staying in, OR
invited him to breakfast — you can eat together.

**If `requires_flag_mode: "any"` isn't supported yet:** Code can implement
this as separate terminal choices with the same text and effects, each
gated by a different single flag. Ugly but functional. OR the node tree
can converge to set a single `scott_engaged` flag that the terminal checks.

**Fallback approach (simplest):** Add a `scott_engaged` flag to all the
engage micro-choices. Terminal checks for that one flag. This is the
recommended approach if `any` mode isn't in the engine.

### 3. The `read_scotts_note` flag

This is a **persistent flag** (not a walk flag). It should survive past
this storylet, stored in `choice_log` as a `FLAG_SET` event. A future
roommate storylet (Day 4-5 range) will check for it — the player can
reference the note to Scott in a later conversation. That callback
storylet is a separate content task.

### 4. Preamble / Body Text

The body (preamble) field on the storylet row should be **empty or minimal**.
All the opening text is in the entry nodes. Set body to something like:

```
Room 214. Morning light through the window your roommate's desk sits under.
```

Just enough to set the scene before the node system takes over.

---

## Chain / Pool Wiring

```
first_morning (Day 1, morning, CHAIN END — default_next_key: NULL)
    ↓ roommate track enters pool mode

scott_day2_morning (Day 2, morning, POOL — no requirements)
    ↓ standalone, default_next_key: NULL

[future: Day 4-5 roommate pool storylet — references read_scotts_note flag]
[future: Day 8-9 scott_letter crystallizer — gates on accumulated trust/reliability]
```

This storylet does NOT chain to anything. It deposits trust/reliability
into Scott's relationship state and optionally sets `read_scotts_note`.
The roommate track stays in pool mode. Future roommate content fires
when its day/segment/requirements are met.

---

## Collision Design

Day 2 morning should have 2 tracks competing:

| Slot | Track | Storylet | Status |
|------|-------|----------|--------|
| 1 | roommate | `scott_day2_morning` | **This storylet** |
| 2 | belonging | TBD (new Day 2 belonging beat) | Not yet written |

Player sees both. If they pick Scott, the belonging beat queues for next
load or expires. If they pick belonging, Scott's storylet persists
(expires_after_days: 7) and can fire on Day 3 morning instead.

---

## System Effects Summary

| Path | Scott trust Δ | Scott reliability Δ | Flags set |
|------|--------------|--------------------|-----------| 
| Warm → shared night → offered next time → breakfast | SHARED_MEAL (+0.5) + SHOWED_UP (+1) | SHOWED_UP (+1) | offered_next_time |
| Warm → shared night → validated staying in → breakfast | SHARED_MEAL (+0.5) + SHOWED_UP (+1) | SHOWED_UP (+1) | validated_staying_in |
| Warm → brief → head out alone | DEFERRED_TENSION (0, -0.5 reliability) | -0.5 | was_brief |
| Neutral → invited → breakfast | SHARED_MEAL (+0.5) + SHOWED_UP (+1) | SHOWED_UP (+1) | invited_scott |
| Neutral → in a bit → head out alone | DEFERRED_TENSION (0, -0.5 reliability) | -0.5 | was_brief |
| Absent → looked at stuff → read note | none | none | looked_at_stuff, read_scotts_note |
| Absent → just leave → head out alone | DEFERRED_TENSION (0, -0.5 reliability) | -0.5 | was_brief |

---

## NPC Notes

- Scott is already introduced via `room_214` (`introduces_npc`). No
  introduction needed here. Name renders normally.
- No new NPCs introduced in this storylet.

---

## Period Texture Checklist

- [x] Cereal from box (no mini-fridge — rare in 1983 dorms)
- [x] Textbook with visible price (physical object, not a PDF)
- [x] Pretenders cassette tape (music as identity, physical media)
- [x] No phone, no screen, no messages — morning is the morning
- [x] Dining hall: trays, plastic cups, powdered eggs, bad coffee
- [x] Hospital corners on bed (character detail, not period, but grounded)
- [x] Industrial cleaner smell in hallway (anchor from setting doc)
- [x] Photo booth strip (physical artifact of a relationship, carried from home)

---

## Content Rules Compliance (Rule 10 Checklist)

```
☑ Mode: POOL
☑ Track: roommate
☑ due_offset_days: 2
☑ Segment: morning
☑ Collision check: 1 other track planned (belonging). 2 total. ✓
☑ Requirements: none (available to all players)
☑ Chains forward: NO. default_next_key = NULL. No choice next_key.
☑ expires_after_days: 7 (orientation — Rule 8)
☑ Previous chain endpoint: first_morning.default_next_key = NULL ✓
☑ introduces_npc: none (Scott already introduced)
☑ Conversational nodes: yes — 3 variant entries, 2 micro-choice layers
☑ Walk flags: shared_night, was_brief, offered_next_time,
  validated_staying_in, invited_scott, looked_at_stuff
☑ Persistent flags: read_scotts_note (via sets_flag on terminal choice)
☑ At least 1 ungated terminal: "head_out_alone" (always visible) ✓
☑ NPC name discipline: Scott known from Day 0 ✓
☑ No cross-track references ✓
```

---

## Playthrough Runner Script Addition

Add to `scripts/playthroughs/`:

```yaml
name: scott_day2_warm_breakfast
description: Day 0 real conversation → Day 2 warm path → breakfast with Scott
extends: fixtures/after_day0_party_path.snapshot.json

steps:
  # Day 2 morning — scott should be available
  - type: expect_storylet_available
    storylet_key: scott_day2_morning
    at: {day: 2, segment: morning, track: roommate}

  # Choose through warm path
  - type: choose_node
    storylet_key: scott_day2_morning
    node_choice_id: tell_him_about_night

  - type: choose_node
    storylet_key: scott_day2_morning
    node_choice_id: next_time

  # Terminal: breakfast with Scott
  - type: choose
    storylet_key: scott_day2_morning
    choice_id: breakfast_with_scott

  # Verify deposits
  - type: expect_relationship
    npc_id: npc_roommate_scott
    field: trust
    op: gte
    value: 2
```

**Note:** The `after_day0_party_path` fixture may need trust pre-set to ≥ 2
for the warm path to fire. If the fixture's trust is lower, either:
(a) create a new fixture from a "real conversation" Day 0 path, or
(b) modify the script to set trust before the expect.

<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/briefs/ folder in MMV repo -->
<!-- ///////////////////////////////////////////// -->
