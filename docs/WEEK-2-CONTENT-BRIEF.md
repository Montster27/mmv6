# Week 2 Content Brief — Code-Ready Spec

> **For Claude Code.** This document contains everything needed for the Week 2 content
> push: engine change (routine mode activation), activity roster expansion, and new
> landmark storylets. Execute in order — engine change first, then activities, then content.

---

## PART 1: Engine Change — Routine Mode Activation Day 3

### What
Move routine-week activation from `day_index >= 7` to `day_index >= 3`.

### Why
Classes start Day 3. The fiction should match the mechanic — when the player's schedule
gains structure, the routine calendar appears. The "short first week" (Days 3–6) is the
player's training ground for time management before Week 2 landmarks arrive.

### Where to change
Search for the activation threshold. It's currently `day_index >= 7` in:
- `WeeklyCalendar` component (UI gate)
- Any server-side logic that checks whether routine mode is active

Change all instances to `day_index >= 3`.

### Testing
- Start a fresh game, advance to Day 3 morning
- Confirm WeeklyCalendar appears and the player can assign activities to slots
- Confirm Days 0–2 do NOT show the calendar

---

## PART 2: Activity Roster Expansion + Time Locks

### Current state
6 seeded activities in `routine_activities`:
- morning_run
- library_study
- herald_writing
- dining_commons_social
- pickup_basketball
- campus_job

### Changes needed

#### A. Add `segment_lock` column to `routine_activities`
New column: `segment_lock TEXT[]` — array of valid segments for this activity.
Values: `'morning'`, `'afternoon'`, `'evening'`. An activity can only be assigned to
slots matching its segment_lock. If NULL or empty, treat as unrestricted (backward compat).

#### B. Update existing activities with segment locks

| Activity | segment_lock | Gate |
|----------|-------------|------|
| morning_run | `{'morning'}` | none |
| library_study | `{'afternoon'}` | none |
| herald_writing | `{'afternoon'}` | `met_karen` flag |
| dining_commons_social | `{'evening'}` | none |
| pickup_basketball | `{'afternoon'}` | none |
| campus_job | `{'afternoon','evening'}` | `has_job_grounds` OR `has_job_dining` OR `has_job_research` OR `has_job_library` |

Note: `campus_job` already has a gate requirement — it should only appear in the activity
picker after the player has accepted a job via `job_board`. Check if this gate exists; add
if not.

#### C. Add 8 new activities

```sql
-- Use the same table pattern as existing routine_activities rows.
-- Query one existing row for column reference:
-- SELECT * FROM routine_activities LIMIT 1;

INSERT INTO routine_activities (slug, title, description, segment_lock, gate_requires, deposits) VALUES

('western_civ_reading', 'Western Civ Reading',
 'Pages 1-38 aren''t going to read themselves. The library has a copy on reserve if you forgot to buy the textbook.',
 '{"morning"}', NULL,
 '{"skill_xp": {"study_discipline": 1}, "energy": -1, "knowledge": 1}'
),

('call_home', 'Call Home',
 'The hallway phone has a long cord. You can almost reach your room if you stretch.',
 '{"morning"}', NULL,
 '{"energy": 1, "stress": -1, "npc_event": {"npc_id": "npc_parent_voice", "type": "reliability", "delta": 1}}'
),

('floor_hangout', 'Floor Hangout',
 'Doors open, someone has cards, someone has a TV. The low-effort version of belonging.',
 '{"evening"}', NULL,
 '{"social_leverage": 1, "npc_event": {"npc_id": "npc_floor_doug", "type": "reliability", "delta": 0.5}}'
),

('music_practice', 'Music Practice',
 'Your roommate''s out. The room is yours. Headphones on, cassette in, air guitar or the real thing.',
 '{"evening"}', NULL,
 '{"skill_xp": {"musical_ear": 1}, "energy": 0, "stress": -1}'
),

('explore_campus', 'Explore Campus',
 'There are buildings you haven''t been inside. Paths you haven''t walked. A campus map is just a suggestion.',
 '{"afternoon"}', NULL,
 '{"knowledge": 1, "energy": -1}'
),

('free_time', 'Free Time',
 'Nothing scheduled. Rest, read a magazine, stare at the ceiling. Sometimes doing nothing is the most productive thing.',
 '{"morning","afternoon","evening"}', NULL,
 '{"energy": 2, "stress": -2}'
),

('volunteer_committee', 'Student Volunteer Committee',
 'A sign-up sheet on the Student Union bulletin board. Orientation week cleanup, campus tour guides, blood drive help.',
 '{"afternoon"}', NULL,
 '{"social_leverage": 1, "skill_xp": {"small_talk": 1}}'
),

('arpanet_terminal', 'ARPANET Terminal',
 'The basement of Whitmore Hall. Green phosphor glow. Nobody else is here at this hour.',
 '{"evening"}', '{"requires_flag": "found_terminal"}',
 '{"knowledge": 1, "skill_xp": {"critical_analysis": 1}}'
);
```

**Deposit schema note:** The `deposits` JSONB above is illustrative. Match the actual
deposit schema used by existing seeded activities. If `npc_event` is not a supported
deposit type yet, omit it and flag for future wiring.

#### D. UI enforcement
The WeeklyCalendar activity picker must filter available activities by:
1. `segment_lock` — only show activities valid for the slot's segment
2. `gate_requires` — only show activities whose gate flags the player has earned

#### E. Scarcity check
After implementation, verify: in each segment, the player has more valid ungated activities
than they have weekly slots for that segment. Target: at least 2 more activities than slots.

**Segment slot counts (5 weekdays):**
- Morning: 5 slots, 3 activities (morning_run, western_civ_reading, call_home) + free_time = 4
- Afternoon: 5 slots, 5 activities (library_study, pickup_basketball, herald_writing, explore_campus, volunteer_committee) + campus_job + free_time = 7
- Evening: 5 slots, 4 activities (dining_commons_social, floor_hangout, music_practice, arpanet_terminal) + campus_job + free_time = 6

Morning is the tightest — 4 activities for 5 slots. That's okay for now: the player can
fill mornings but not without committing to routines. Afternoons and evenings are properly
scarce.

---

## PART 3: Storylet — L2 `scott_notices` (Day 11 Evening)

### Metadata

- **storylet_key:** `scott_notices`
- **Title:** "Room 214"
- **Track:** roommate (`e40e9452-c2e4-47e5-bc64-210e5233a955`)
- **Segment:** evening
- **due_offset_days:** 11
- **expires_after_days:** 2
- **time_cost_hours:** 2
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'roommate', 'week2', 'crystallizer', 'frame_bleed']`
- **introduces_npc:** `[]`
- **requirements:** `{}`

### Body

```
The room is dark except for Scott's desk lamp. You can hear someone's stereo through the wall — something with synthesizers, the bass line drifting through cinder block like a pulse. Scott is on his bed, back against the wall, a textbook open on his lap that he stopped reading twenty minutes ago.

You've been at your desk pretending to work. The kind of evening where the room is shared but quiet, two people occupying the same space without needing to fill it. Outside, someone laughs in the hallway and a door closes.

Scott turns a page he hasn't read. Then he stops.
```

### Nodes

```json
[
  {
    "id": "scott_opens",
    "text": "\"Can I ask you something weird?\"",
    "condition": { "npc_memory": "npc_roommate_scott.trust_high" },
    "micro_choices": [
      {
        "id": "sure",
        "next": "the_question",
        "label": "\"Sure.\""
      },
      {
        "id": "depends",
        "next": "the_question",
        "label": "\"Depends on how weird.\""
      }
    ]
  },
  {
    "id": "scott_opens_low",
    "text": "He glances at you, then back at the ceiling. \"You're kind of a weird dude, you know that?\" He says it like a joke. The delivery is almost right.",
    "condition": { "npc_memory": "npc_roommate_scott.trust_low" },
    "micro_choices": [
      {
        "id": "laugh_low",
        "next": "the_observation_low",
        "label": "Laugh. \"Thanks.\""
      },
      {
        "id": "wait_low",
        "next": "the_observation_low",
        "label": "Wait for whatever comes next."
      }
    ]
  },
  {
    "id": "scott_absent",
    "text": "The room is empty. Scott's jacket is gone. His desk light is off. A textbook sits open on his bed, face-down, spine cracking.\n\nYou sit at your desk. The quiet has a different quality when someone else's stuff is here but they're not. His cassettes are stacked by the stereo. A letter from home tucked under the lamp base. A life accumulating in parallel to yours, on the other side of the room.",
    "condition": { "default": true },
    "next": "alone_in_214"
  },
  {
    "id": "the_question",
    "text": "He doesn't look at you. He's talking to the ceiling.\n\n\"You never seem surprised by anything.\" He pauses. \"Like — remember when the fire alarm went off Tuesday? Everyone was freaking out and you just... got your jacket and walked out. Like you knew it was coming.\"\n\nHe turns his head toward you. \"And you knew where the bookstore was. First day. You didn't check the map once.\"",
    "micro_choices": [
      {
        "id": "laugh_off",
        "next": "scott_accepts",
        "label": "\"I just pay attention.\"",
        "sets_flag": "deflected_scott"
      },
      {
        "id": "go_quiet",
        "next": "scott_reads_silence",
        "label": "Go quiet. Let the silence sit.",
        "sets_flag": "scott_noticed_something"
      },
      {
        "id": "turn_it_back",
        "next": "scott_accepts",
        "label": "\"What do you mean?\" — make him say it.",
        "sets_flag": "scott_noticed_something"
      },
      {
        "id": "deflect_warm",
        "next": "scott_accepts",
        "label": "\"You're the weird one, man.\"",
        "sets_flag": "deflected_scott_warm"
      }
    ]
  },
  {
    "id": "the_observation_low",
    "text": "\"No, I mean it.\" He's still half-smiling but the smile isn't doing anything. \"You walk around like you've been here before. Like you already know where everything is.\"\n\nHe waits a beat. \"Most freshmen look lost. You don't look lost.\"",
    "micro_choices": [
      {
        "id": "brush_off_low",
        "next": "scott_drops_it",
        "label": "\"Good sense of direction, I guess.\"",
        "sets_flag": "deflected_scott"
      },
      {
        "id": "hold_gaze_low",
        "next": "scott_files_it",
        "label": "Hold his gaze. Don't say anything.",
        "sets_flag": "scott_noticed_something"
      }
    ]
  },
  {
    "id": "scott_reads_silence",
    "text": "The silence goes on longer than it should. Scott watches you. You can feel him deciding whether to push.\n\nHe doesn't push.\n\n\"Okay,\" he says. He looks back at the ceiling. The stereo through the wall changes tracks. Neither of you moves to fill the space.\n\nBut something has shifted. He asked and you didn't answer, and the not-answering told him more than an answer would have.",
    "next": "choices"
  },
  {
    "id": "scott_accepts",
    "text": "He nods. It's not a satisfied nod — more like the nod you give when you know the real answer isn't coming. \"Yeah. Okay.\"\n\nHe goes back to his textbook. You go back to your desk. The room returns to what it was, almost. The stereo through the wall is between tracks. In the gap, you can hear the hallway — someone on the phone, a door closing.",
    "next": "choices"
  },
  {
    "id": "scott_drops_it",
    "text": "\"Right.\" He picks the textbook back up. The joke energy is gone and nothing replaced it. The room settles back into its two-person quiet.\n\nHe didn't get what he was looking for. He's not sure what he was looking for.",
    "next": "choices"
  },
  {
    "id": "scott_files_it",
    "text": "He holds your look for two seconds. Then three. Then he nods, slowly, and looks away.\n\n\"Alright,\" he says. Not a dismissal. An acknowledgment. He files it wherever he files things he doesn't understand yet.\n\nHe goes back to his textbook. But the room feels different. Not uncomfortable. Just... observed.",
    "next": "choices"
  },
  {
    "id": "alone_in_214",
    "text": "You sit with it for a while. The room when it's just yours. His alarm clock ticking on the nightstand. The poster he taped up — Springsteen, Born in the U.S.A., slightly crooked.\n\nYou don't know where he went. You're not sure if you would have asked.",
    "next": "choices"
  }
]
```

### Choices (Terminal)

```json
[
  {
    "id": "lights_out_close",
    "label": "Turn off your desk lamp and lie there in the dark",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["people", "safety"],
    "relational_effects": [],
    "events_emitted": [
      {
        "condition": "has_flag:scott_noticed_something",
        "type": "npc_memory",
        "npc_id": "npc_roommate_scott",
        "key": "noticed_something",
        "value": true
      },
      {
        "condition": "has_flag:scott_noticed_something",
        "type": "npc_trust",
        "npc_id": "npc_roommate_scott",
        "delta": 1
      }
    ],
    "sets_flag": ["scott_notices_resolved"],
    "reaction_text": "The ceiling is acoustic tile. You count the holes in one square. You lose count. You start again. The stereo through the wall has stopped. Scott's breathing changes. One of you will be asleep first."
  },
  {
    "id": "step_out",
    "label": "Grab your jacket and step into the hallway",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["avoid"],
    "relational_effects": [],
    "events_emitted": [
      {
        "condition": "has_flag:deflected_scott",
        "type": "npc_memory",
        "npc_id": "npc_roommate_scott",
        "key": "roommate_avoids",
        "value": true
      }
    ],
    "sets_flag": ["scott_notices_resolved"],
    "reaction_text": "The hallway is bright after the dim room. Fluorescent light and industrial carpet. Someone left a pizza box on the phone shelf. The door to 214 clicks shut behind you.\n\nYou walk. No destination. Just the need to not be in a room where someone is looking at you like they're trying to read a book in a language they almost recognize."
  }
]
```

### NPC Memory Dependencies

This storylet branches on NPC memory set by prior Scott encounters. The condition routing:

| Entry Node | Condition | Set by |
|-----------|-----------|--------|
| `scott_opens` (high trust) | `npc_roommate_scott.trust_high` | Should be set when player has 2+ positive Scott interactions: `scott_engaged` (from scott_day2_morning) AND at least one of: `scott_cereal_warm` (Day 8) or `scott_letter_connected` (Day 9) |
| `scott_opens_low` (low trust) | `npc_roommate_scott.trust_low` | Set when player has interacted with Scott but kept distance. Player has met Scott (room_214 resolved) but `trust_high` is not set. |
| `scott_absent` (miss) | `default: true` | Fallback. Fires when neither trust condition is met — player has had minimal Scott engagement (missed cereal, missed letter, or both). |

**Implementation note for Code:** The `trust_high` / `trust_low` NPC memory keys may need
to be written by prior Scott storylets (scott_cereal, scott_letter_*) as NPC memory events.
Check whether those storylets currently set NPC memory that can be read here. If not, add
`npc_memory` writes to their terminal choices as a prerequisite migration.

### Flags Set by This Storylet

| Flag | Set by | Used by |
|------|--------|---------|
| `scott_noticed_something` | micro-choice: go_quiet, turn_it_back, hold_gaze_low | Arc Two: Scott confidant track gate. Scott remembers this moment when things get stranger. |
| `deflected_scott` | micro-choice: laugh_off, brush_off_low | Arc Two: Scott has to rebuild trust from baseline. He asked and you shut the door. |
| `deflected_scott_warm` | micro-choice: deflect_warm | Intermediate — Scott knows you dodged but doesn't hold it against you. |
| `scott_notices_resolved` | terminal choices (both) | Prevents re-fire. Standard pool completion flag. |

### What This Seeds (Long Arc)

The `scott_noticed_something` flag is the single most important roommate flag in the game.
It determines whether Scott enters Arc Two as someone who has *already been thinking about
this* or someone who encounters the strangeness fresh. The relationship can go many places
across 50 years — confidant, estranged, protector, skeptic, the friend who knew before
anyone else — but they all fork from this night.

The miss path (Scott absent) is equally important. The player who didn't invest in Scott
doesn't get this scene at all. They get an empty room. And they don't know what they missed.

---

## PART 4: Storylet — L5 `the_post` (Day 14 Afternoon)

### Metadata

- **storylet_key:** `the_post`
- **Title:** "The Delphi Group"
- **Track:** opportunity
- **Segment:** afternoon
- **due_offset_days:** 14
- **expires_after_days:** 7
- **time_cost_hours:** 2
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'opportunity', 'week2', 'landmark', 'frame', 'investigation']`
- **introduces_npc:** `[]`
- **requirements:** `{"requires_flag": "tuesday_terminal"}`

### Concept

The player returns to the Whitmore Hall basement terminal and finds, buried in Usenet
groups, what looks like an academic forecasting forum: **net.futures.delphi**. It reads
like professors and grad students playing prediction games — "What technology will have
the greatest civilian impact by 1990?" "Which current policy will historians judge as
the pivotal mistake of this decade?"

To a 1983 person, it's intellectual exercise. To the player, the questions have *answers*.
And the people asking them seem to know that.

A pinned thread announces a "forecasting challenge" — answer correctly to gain access to
a restricted discussion area. The challenge is three prediction questions. Getting them
right (matching the actual future) unlocks a password-protected sub-thread.

**The gate IS the authentication.** It's how Knowers find each other without announcing
themselves. Anyone from 1983 would guess randomly. Only someone who knows the future
passes.

### What's Behind the Gate

The protected space is NOT a time-travel briefing. It's an academic forum that reads
differently depending on what you know:

- **History threads** — discussions about what forces actually change societies. The examples
  are suspiciously precise. Someone keeps citing patterns that rhyme with what the player
  knows is coming. A post about "the conditions under which authoritarian states reform"
  reads like a casual theory paper. The player recognizes it as a description of 1989.

- **Physics threads** — theoretical discussions about causality, closed timelike curves,
  information paradoxes. All couched in "what if" language. Nobody says "time travel."
  They say "temporal displacement as a thought experiment." The math is real. The framing
  is careful.

- **"Minor" current events flagged as significant** — someone in the group keeps
  highlighting stories a 1983 reader would skip. An obscure CDC report. A computing
  standard being debated in committee. A trade policy between nations that don't seem
  important yet. The player recognizes these as seeds of everything that comes next.

**The effect on the player:** This space doesn't tell them what's going on. It tells them
they're not the only one who sees what they see. And the people here are organized — they've
been at this longer, they have a system, they have each other.

### Body

```
The basement is empty. Tuesday afternoon — everyone's in class or at the dining hall.
The terminal hums, green phosphor warming the cinder block.

You log on. The Usenet index scrolls by — net.philosophy, net.misc, rec.music, the
familiar groups you've browsed before. But today you go deeper. Glenn's direction was
to look for things that don't fit. People who know things they shouldn't.

Buried three pages into the newsgroup list, between net.futures and net.games, there's
a group you haven't noticed before: net.futures.delphi. The description reads:
"Structured forecasting and scenario analysis. Challenge thread active."
```

### Nodes

```json
[
  {
    "id": "browse_delphi",
    "text": "The group has maybe forty posts. Most read like academic exercises — long-winded arguments about technological adoption curves and geopolitical modeling. The kind of thing a poli-sci grad student would write after too much coffee.\n\nBut one thread is pinned: \"FORECASTING CHALLENGE — Q4 1983. Complete to access restricted archive.\"",
    "micro_choices": [
      {
        "id": "open_challenge",
        "next": "challenge_intro",
        "label": "Open the challenge thread."
      },
      {
        "id": "read_posts_first",
        "next": "scan_posts",
        "label": "Read the other posts first."
      }
    ]
  },
  {
    "id": "scan_posts",
    "text": "You scroll through. Most of it is dense and theoretical. But a few posts stop you.\n\nOne user — handle 'cassandra_7' — keeps flagging news items. An AP wire story about a CDC investigation into immune deficiency cases. A brief about semiconductor trade negotiations with Japan. A note about a local zoning decision in Northern California, near some place called Stanford Research Park.\n\nNone of these are front-page news. All of them are things you recognize.\n\nAnother user — 'heraclitus' — writes about historical cycles. Their analysis of how surveillance states collapse reads like a history textbook. Except the history hasn't happened yet.",
    "next": "challenge_intro"
  },
  {
    "id": "challenge_intro",
    "text": "The challenge thread has simple rules:\n\n\"The following questions concern near-term developments in technology, geopolitics, and culture. Respondents who demonstrate consistent forecasting accuracy will receive access credentials for the Delphi restricted archive. Submit answers via the reply form below.\"\n\nThree questions. Multiple choice. Academic framing. But you read them and your stomach drops. These aren't guesses for a 1983 person. For you, they're memory.",
    "micro_choices": [
      {
        "id": "take_challenge",
        "next": "question_1",
        "label": "Start answering."
      },
      {
        "id": "hesitate",
        "next": "hesitation",
        "label": "Sit back from the terminal."
      }
    ]
  },
  {
    "id": "hesitation",
    "text": "If you answer correctly, someone will know. Not just that someone is smart — lots of people are smart. That someone knows what's coming. That's a different thing entirely.\n\nGlenn said to find the others. He didn't say what happens when they find you.",
    "micro_choices": [
      {
        "id": "proceed_anyway",
        "next": "question_1",
        "label": "Type your answers.",
        "sets_flag": "delphi_hesitated"
      },
      {
        "id": "walk_away",
        "next": "walk_away_node",
        "label": "Log off. Not today.",
        "sets_flag": "delphi_refused"
      }
    ]
  },
  {
    "id": "question_1",
    "text": "\"QUESTION 1: Which of the following technologies will achieve the widest civilian adoption by 1990?\"\n\nA) Videodisc / LaserDisc home systems\nB) Personal computing platforms\nC) Satellite-based mobile telephony\nD) Home robotics",
    "micro_choices": [
      {
        "id": "q1_a",
        "next": "question_2",
        "label": "A — Videodisc"
      },
      {
        "id": "q1_b",
        "next": "question_2",
        "label": "B — Personal computing",
        "sets_flag": "delphi_q1_correct"
      },
      {
        "id": "q1_c",
        "next": "question_2",
        "label": "C — Satellite telephony"
      },
      {
        "id": "q1_d",
        "next": "question_2",
        "label": "D — Home robotics"
      }
    ]
  },
  {
    "id": "question_2",
    "text": "\"QUESTION 2: Current CDC investigations into immune deficiency cases will, within five years, most likely:\"\n\nA) Resolve as a regional public health anomaly\nB) Expand into a global epidemic affecting millions\nC) Be reclassified as an environmental exposure issue\nD) Remain a low-priority research concern",
    "micro_choices": [
      {
        "id": "q2_a",
        "next": "question_3",
        "label": "A — Regional anomaly"
      },
      {
        "id": "q2_b",
        "next": "question_3",
        "label": "B — Global epidemic",
        "sets_flag": "delphi_q2_correct"
      },
      {
        "id": "q2_c",
        "next": "question_3",
        "label": "C — Environmental exposure"
      },
      {
        "id": "q2_d",
        "next": "question_3",
        "label": "D — Low-priority concern"
      }
    ]
  },
  {
    "id": "question_3",
    "text": "\"QUESTION 3: The most significant geopolitical realignment in Europe before 1992 will be driven primarily by:\"\n\nA) Economic integration of Western European markets\nB) Internal reform and collapse of Eastern Bloc governance\nC) NATO expansion triggering a conventional arms race\nD) A pan-European labor movement",
    "micro_choices": [
      {
        "id": "q3_a",
        "next": "submit_answers",
        "label": "A — Economic integration"
      },
      {
        "id": "q3_b",
        "next": "submit_answers",
        "label": "B — Eastern Bloc collapse",
        "sets_flag": "delphi_q3_correct"
      },
      {
        "id": "q3_c",
        "next": "submit_answers",
        "label": "C — NATO arms race"
      },
      {
        "id": "q3_d",
        "next": "submit_answers",
        "label": "D — Labor movement"
      }
    ]
  },
  {
    "id": "submit_answers",
    "text": "You hit RETURN. The terminal processes for a moment — longer than it should, the cursor blinking. Then a new line appears.",
    "condition": { "all_flags": ["delphi_q1_correct", "delphi_q2_correct", "delphi_q3_correct"] },
    "next": "access_granted"
  },
  {
    "id": "submit_answers_fail",
    "text": "You hit RETURN. The terminal processes. Then:\n\n> FORECASTING SCORE: INSUFFICIENT FOR ARCHIVE ACCESS.\n> CHALLENGE RESETS MONTHLY. THANK YOU FOR YOUR PARTICIPATION.\n\nThe cursor blinks. The screen returns to the thread index. Whatever is behind that gate, you didn't get the combination right.",
    "condition": { "default": true },
    "next": "choices"
  },
  {
    "id": "access_granted",
    "text": "The screen clears. New text:\n\n> FORECASTING SCORE: 3/3.\n> ACCURACY PROFILE: CONSISTENT WITH STRUCTURED KNOWLEDGE.\n> ARCHIVE ACCESS GRANTED.\n> PASSWORD: CASSANDRA\n\nThe word sits there on the screen, green on black. Then the archive loads.\n\nIt's a sub-thread. Thirty, maybe forty posts. No dates older than six months. The tone is different from the public forum — less academic, more careful. People talking around something without ever naming it directly.",
    "next": "archive_content"
  },
  {
    "id": "archive_content",
    "text": "You read. Your eyes adjust to the green glow. Time passes and you don't notice.\n\nA thread about historical inflection points — someone argues that societies change not through single events but through the accumulation of small decisions that make the event inevitable. The examples are from the past. The implications are not.\n\nA thread about physics. Closed timelike curves. Information theory. Whether a signal can exist before its source. The math is real. The questions are framed as hypothetical. But the hypotheticals are very specific.\n\nA thread where 'cassandra_7' lists nine things. Nine current events, all minor, all buried in back pages. You recognize seven of them. They are the seeds of everything that comes next.",
    "micro_choices": [
      {
        "id": "keep_reading",
        "next": "the_realization",
        "label": "Keep reading. All of it."
      },
      {
        "id": "stop_at_the_list",
        "next": "the_realization",
        "label": "Go back to the list of nine things."
      }
    ]
  },
  {
    "id": "the_realization",
    "text": "These people know.\n\nNot all of them, maybe. Some could be genuine forecasters — smart, well-read, lucky. But cassandra_7 isn't lucky. Heraclitus isn't guessing. The questions they ask have the shape of answers turned inside out.\n\nYou are not the only one here.\n\nThe terminal hums. The basement is still empty. The clock on the wall says you've been here ninety minutes.",
    "next": "choices"
  },
  {
    "id": "walk_away_node",
    "text": "You pull your hands back from the keyboard. The questions glow on the screen. You know the answers to all of them.\n\nThat's exactly why you don't type them.\n\nYou log off. The terminal returns to its blinking cursor. The basement is quiet. Whatever is behind that gate will still be there next week. Or it won't. Either way, today you chose not to announce yourself.",
    "next": "choices"
  }
]
```

### Choices (Terminal)

```json
[
  {
    "id": "log_off_shaken",
    "label": "Log off. Sit in the basement for a while.",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["risk", "investigate"],
    "relational_effects": [],
    "events_emitted": [
      {
        "condition": "has_flag:delphi_q1_correct",
        "type": "arc_flag",
        "flag": "delphi_archive_accessed"
      }
    ],
    "sets_flag": ["the_post_resolved"],
    "reaction_text": "The monitor dims to screensaver. Green phosphor fading. You sit in the folding chair and listen to the building breathe — the pipes, the fluorescent hum, a door closing somewhere upstairs.\n\nYou came here looking for traces. You found a community. People who have been doing this — whatever this is — longer than you. Who built a system. Who are waiting to see who else passes the test.\n\nThey'll see your answers. They'll know someone at Harwick got 3/3.\n\nThe walk back to the dorm feels longer than the walk here."
  },
  {
    "id": "log_off_quick",
    "label": "Log off and leave. Don't look back at the screen.",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety", "avoid"],
    "relational_effects": [],
    "events_emitted": [],
    "sets_flag": ["the_post_resolved"],
    "reaction_text": "You're up the stairs and into daylight before you've finished thinking about what you just read. The quad is full of students walking to afternoon classes, backpacks and sneakers and someone throwing a frisbee. Normal. Ordinary. 1983.\n\nDownstairs, in a basement, on a network most of these people don't know exists, there are people who know what's coming. And now they know someone else is here."
  }
]
```

### Branching Logic — Quiz Scoring

**Implementation note for Code:** The quiz requires tracking whether all 3 correct answers
were selected. The `submit_answers` node has a condition checking for all three correct
flags. The `submit_answers_fail` node is the default fallback.

Two possible implementations:
1. **Walk flags + compound condition:** Each correct answer sets a walk flag
   (`delphi_q1_correct`, etc.). The `submit_answers` node fires only if all three are set.
   This requires compound flag checking on node conditions — verify whether
   `DialogueNode.condition` supports `all_flags` checks. If not, this needs a small
   engine extension.
2. **Simpler fallback:** If compound conditions aren't supported, use a scoring node after
   Q3 that checks flags sequentially and routes to `access_granted` or `submit_answers_fail`.
   Less elegant but works within current engine.

**The walk-away path:** If the player chooses "Log off. Not today." at the hesitation
node, they skip the quiz entirely. The `delphi_refused` flag is set. This storylet
can re-fire in Week 3 (expires_after_days = 7) — the thread ages but the challenge
remains. If the player never returns, the miss path is: the Delphi Group continues
without them. In Arc Two, cassandra_7 and heraclitus have built their network, and
the player was never part of it. They find the others later, from outside, on less
favorable terms.

### Arc Flags Set

| Flag | Scope | Set by | Used by |
|------|-------|--------|---------||
| `delphi_archive_accessed` | arc | Terminal choice (log_off_shaken) + correct quiz | Arc Two: player is known to the Delphi network. They will receive contact. |
| `delphi_refused` | walk | Hesitation node (walk_away) | Week 3: storylet can re-fire with different tone. The thread has aged. |
| `delphi_hesitated` | walk | Hesitation node (proceed_anyway) | Prose variation in archive_content — the player's caution colors how they read. |
| `the_post_resolved` | track | Terminal choices (both) | Standard pool completion flag. |

### What This Seeds (Long Arc)

The Delphi Group is the player's entry point into the organized Knower community. In
later arcs, these usernames become people:
- **cassandra_7** — the pattern-spotter. Archives everything. Will become a major NPC.
- **heraclitus** — the theorist. Interested in *why* time displacement works, not just
  *that* it works. Potential ally or ideological opponent depending on the player's stance
  (Improve vs Investigate).

Players who accessed the archive enter Arc Two with the network already aware of them.
Players who refused or failed enter Arc Two alone — they'll encounter the Knower community
from the outside, without the trust that early membership provides. Same fork shape as
Scott's Thing: the player who invested early has infrastructure when it matters.

### Prose Guidelines
- The terminal text should look like 1983 Usenet — monospaced, lowercase-heavy, no
  formatting beyond line breaks. Think `comp.sys.misc` posting style.
- The quiz questions should read as plausible academic exercises. A smart 1983 person
  could argue for any answer. Only someone who *knows* picks B every time.
- The archive content is described, not quoted at length. The player reads for 90 minutes
  (in-fiction). We give them the shape of what they found, not a transcript.
- No one in the Delphi Group uses the words "time travel." Ever.
- The emotional register is quiet awe. Not thriller. Not horror. The feeling of
  walking into a room and realizing everyone there already knows what you know.

---

## PART 5: Decisions Log

Add these to `docs/DECISIONS.md`:

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-20 | **Routine mode activates Day 3** (was Day 7) | Classes start Day 3 — the fiction matches the mechanic. Short first week (Days 3–6) is training. |
| 2026-04-20 | **Activities are time-locked to segments** | morning_run is morning only, floor_hangout is evening only, etc. Creates natural collisions. |
| 2026-04-20 | **14 activities total (6 existing + 8 new)** | 3 morning, 5 afternoon, 6 evening. Every segment has more valid activities than slots. Afternoon and evening are the sharpest squeeze. |
| 2026-04-20 | **L2 (scott_notices) placed Day 11 evening** | Roommate crystallizer. Scott notices the player doesn't act like a freshman. Three entry paths based on accumulated trust. Sets `scott_noticed_something` — the single most important roommate flag for the 50-year arc. |
| 2026-04-20 | **L5 (the_post) placed Day 14 afternoon** | Investigation landmark. Gated by `tuesday_terminal` flag (chose terminal on tuesday_commitment). Separate from the Day 14 evening tuesday_night pileup. |
| 2026-04-20 | **L5 (the_post) designed as "The Delphi Group"** | Forecasting quiz as Knower authentication. 3 questions about future events — only a time traveler gets all 3 right. Unlocks a password-protected Usenet archive of oblique discussions (historical forces, temporal physics, flagged "minor" current events). Sets `delphi_archive_accessed` arc flag. Introduces cassandra_7 and heraclitus as future NPCs. Walk-away path available — player can refuse to announce themselves. |
| 2026-04-20 | **DEFERRED: Minimum weekly activity frequency for meaningful deposits** | Revisit after Week 2 playtest. Current deposits apply per-slot regardless of weekly frequency. |
