# Glenn & Terminal — Content Brief for Code
> **Purpose:** Complete prose, node structure, and system effects for 3 storylets.
> Code session turns this into SQL migrations.
> **Date:** 2026-04-03 (corrected 2026-04-03: default_next_key fix)
> **Design doc:** Obsidian vault → `current/Design/Glenn_Terminal_Sequence_Design.md`

---

## Storylet 1: `glenn_pastime_paradise`

### Metadata
```yaml
slug: glenn_pastime_paradise
title: Pastime Paradise
track: opportunity
storylet_key: glenn_pastime_paradise
segment: afternoon
due_offset_days: 0
expires_after_days: 7
time_cost_hours: 0
is_active: true
introduces_npc: ["npc_contact_glenn"]
default_next_key: null  # NOT evening_choice — cross-track chain fails silently per CONTENT-RULES Rule 3. Evening fires independently on belonging track via its own chain.
tags: ["opportunity", "frame_story", "glenn"]
requirements: {}
weight: 100
```

### Body (Preamble)
```
The path from the bookstore cuts between the chapel and a row of oaks that still hold August's weight. A bench sits off the path, angled toward nothing in particular. Someone's on it — corduroy jacket, sleeves pushed up, sneakers that stopped being white a long time ago. He has a guitar across his lap, playing something you recognize before you should.

The melody is Stevie Wonder. Songs in the Key of Life. That descending line that sits in your chest. You know it from a hundred car radios. But the voice is wrong — not singing Stevie's words. A rhythm over the melody, spoken more than sung, a cadence that rolls like somebody preaching to an empty room. It sounds like the future wearing 1976's clothes.

Your feet stop before you decide to stop.
```

### Nodes

```json
[
  {
    "id": "recognition_hit",
    "text": "Something happens in your head. Not a thought. A physical thing — like the ground shifted an inch to the left and came back. You know those words. Not the melody — everybody knows the melody. The words. The rhythm of them over that hook. You've heard this exact combination a thousand times and it doesn't exist.\n\nIt can't exist. Not for another twelve years.",
    "next": "glenn_looks_up"
  },
  {
    "id": "glenn_looks_up",
    "text": "He stops playing. Looks at you with the expression of someone checking whether a door just opened. Everything about him says twenty-one except his eyes, which carry mileage.\n\n\"You know that one?\"",
    "speaker": "npc_contact_glenn",
    "micro_choices": [
      {
        "id": "called_it_out",
        "label": "\"That's Stevie Wonder. But those aren't his words.\"",
        "next": "mc_recognized",
        "sets_flag": "called_it_out"
      },
      {
        "id": "asked_origin",
        "label": "\"Where'd you learn that?\"",
        "next": "mc_curious",
        "sets_flag": "asked_origin"
      },
      {
        "id": "walk_away",
        "label": "Keep walking.",
        "next": "mc_walked_away",
        "sets_flag": "walked_away"
      }
    ]
  },
  {
    "id": "mc_recognized",
    "text": "Something crosses his face. Not surprise — confirmation. He sets a hand flat on the guitar strings to kill the ring.\n\n\"No. They're not.\" He looks at you the way you'd look at a letter you've been waiting for. \"Good.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_direction"
  },
  {
    "id": "mc_curious",
    "text": "He tilts his head. Studies you for a beat longer than comfortable.\n\n\"Nowhere you'd find it on a radio.\" He lifts the guitar off his lap, rests it against the bench. \"You stopped, though. Most people don't.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_direction"
  },
  {
    "id": "mc_walked_away",
    "text": "You make it four steps before the melody starts again behind you. The words find you through the shade and you almost turn around. Almost. The dining hall is right there and someone's calling a name that might be yours.\n\nBut something opened in the back of your head and it doesn't close. For the rest of the afternoon, you catch yourself humming a song you can't place and it makes your hands cold.",
    "next": "choices"
  },
  {
    "id": "glenn_direction",
    "text": "He stands. Not urgently — like someone who's already late for something and decided it can wait another minute.\n\n\"There's a computer lab in the basement of Whitmore. CS department runs it.\" He pulls the guitar strap over his shoulder. \"Tell whoever's at the desk you're looking at the network project. Get yourself a login. Read what's there.\"",
    "speaker": "npc_contact_glenn",
    "micro_choices": [
      {
        "id": "ask_who",
        "label": "\"Who are you?\"",
        "next": "glenn_deflects_name"
      },
      {
        "id": "ask_what",
        "label": "\"What am I going to find?\"",
        "next": "glenn_deflects_what"
      },
      {
        "id": "ask_why",
        "label": "\"Why are you telling me this?\"",
        "next": "glenn_deflects_why"
      }
    ]
  },
  {
    "id": "glenn_deflects_name",
    "text": "A half-smile that doesn't touch the rest of his face.\n\n\"Somebody who stopped on this bench about two years ago because of the same song.\" He adjusts the strap. \"Go look at the network. Then decide if you want to come back and ask better questions.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_exits"
  },
  {
    "id": "glenn_deflects_what",
    "text": "\"Things that shouldn't be there yet.\" He says it simply, like telling you the dining hall is past the quad. \"You'll know it when you see it. Same way you knew that song.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_exits"
  },
  {
    "id": "glenn_deflects_why",
    "text": "He looks past you at something — the chapel, the oaks, the sky. Some distance he's measuring.\n\n\"Because the bench was empty when I got here. Nobody told me where to look. Took me eight months.\" He meets your eyes. \"You get to skip that part.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_exits"
  },
  {
    "id": "glenn_exits",
    "text": "He walks toward the chapel without looking back. The guitar makes a soft percussive thump against his hip with each step. You stand on the path with the afternoon pressing on your shoulders and something in your chest that wasn't there this morning.\n\nSomeone behind you asks if you know where the registrar's office is. The world is still moving. It just looks different now.",
    "next": "choices"
  }
]
```

### Terminal Choices
```json
[
  {
    "id": "head_to_evening",
    "label": "Head toward the evening",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["risk"],
    "outcome": { "text": "", "deltas": {} },
    "set_npc_memory": {
      "npc_contact_glenn": { "noticed_glenn": true }
    },
    "events_emitted": [
      { "npc_id": "npc_contact_glenn", "type": "MYSTERIOUS_ENCOUNTER", "magnitude": 2 }
    ]
  }
]
```

### System Effects Summary
- `npc_contact_glenn`: met=true, knows_face=true, knows_name=false
- If NOT walked_away: player flag `glenn_gave_direction` = true (via micro-choice flags — Code should persist `called_it_out` or `asked_origin` as the marker; if either is set, direction was given)
- If walked_away: `glenn_gave_direction` stays false. Delayed terminal access opens Day 4+.

### Miss Path
If the player never encounters this storylet (engine timing or segment conflict): Glenn doesn't appear. The opportunity track stays `undiscovered`. Terminal access opens later via a different trigger — overhearing CS lab mentioned, or a bulletin board note. That fallback storylet is a future content task, not part of this batch.

---

## Storylet 2: `terminal_first_visit`

### Metadata
```yaml
slug: terminal_first_visit
title: The Terminal
track: opportunity
storylet_key: terminal_first_visit
segment: afternoon
due_offset_days: 1
expires_after_days: 14
time_cost_hours: 1
is_active: true
introduces_npc: []
default_next_key: null
tags: ["opportunity", "frame_story", "terminal", "arpanet"]
requirements:
  requires_flag: "glenn_gave_direction"
  # Delayed path alternative: OR day_index >= 4
  # (Code decides best implementation — either two pool variants
  #  or a compound requirement)
weight: 100
```

### Body (Preamble)
```
Whitmore Hall looks different from the basement. Upstairs is lecture halls and corkboard — syllabi, club flyers, a "Welcome Class of '87" poster curling at the corners. The stairwell down smells like electrical heat and floor wax. At the bottom, a windowless room. Fluorescent tubes. Six terminals lined against the far wall, amber screens waiting.

A grad student sits behind a metal desk near the door. Beard, flannel, the particular posture of someone who's been reading the same journal article for two hours.
```

### Nodes

```json
[
  {
    "id": "approach_desk",
    "text": "He looks up when you step in. Not unfriendly, but not welcoming either. This room belongs to him and the people who understand what's in it.\n\n\"Help you?\"",
    "micro_choices": [
      {
        "id": "use_phrase",
        "label": "\"I'm here about the network project.\"",
        "next": "mc_password",
        "sets_flag": "used_glenn_phrase"
      },
      {
        "id": "cold_ask",
        "label": "\"Can I get on one of these?\"",
        "next": "mc_cold_ask"
      },
      {
        "id": "hesitate",
        "label": "Look at the terminals, then back at him.",
        "next": "mc_cold_ask"
      }
    ]
  },
  {
    "id": "mc_password",
    "text": "The phrase lands differently than you expected. He puts the journal down. Looks at you — not your face exactly, more like he's reading something behind it.\n\n\"Terminal four.\" He pulls a slip of paper from a drawer, writes a login and password in small block letters. \"Don't change anything. Don't print anything. If Dr. Adler comes in, you're auditing Intro to Computing.\" He goes back to his journal.",
    "next": "sit_down"
  },
  {
    "id": "mc_cold_ask",
    "text": "\"These are for CS students and authorized researchers.\" He says it like a recording. \"You enrolled in a CS section?\"",
    "micro_choices": [
      {
        "id": "thinking_about_it",
        "label": "\"I'm thinking about it.\"",
        "next": "mc_turned_away"
      },
      {
        "id": "use_phrase_late",
        "label": "\"Someone told me to look at the network project.\"",
        "next": "mc_password"
      }
    ]
  },
  {
    "id": "mc_turned_away",
    "text": "\"Come back with a section number.\" He's already reading again. The terminals hum behind him, amber and patient. Whatever's on them will wait.",
    "next": "choices"
  },
  {
    "id": "sit_down",
    "text": "Terminal four. The chair is hard plastic. The screen throws amber light on your hands as you type the login. The cursor blinks, then the prompt appears:\n\nharwick%\n\nYou don't know Unix. But the slip of paper has one more line, in smaller letters: readnews",
    "next": "the_feed"
  },
  {
    "id": "the_feed",
    "text": "The screen fills with text. Newsgroup headers. net.unix.wizards — incomprehensible. net.jokes — someone's posted the same knock-knock joke to three groups. net.misc — campus parking, a book recommendation, an argument about the new Talking Heads record.\n\nThen you stop scrolling.",
    "next": "wrong_post"
  },
  {
    "id": "wrong_post",
    "text": "A post in net.misc. The subject line reads: \"pattern recognition and asset allocation in emerging markets\"\n\nIt's a discussion thread. Two, maybe three people. The language is careful — academic on the surface, but the specifics don't fit 1983. One poster describes a pattern in Pacific Rim manufacturing that reads like a forecast. Another responds with a correction that references a trade policy that won't be drafted for three years.\n\nYou don't know any of this. But you know it shouldn't be here. The same way you knew the song.",
    "next": "the_message"
  },
  {
    "id": "the_message",
    "text": "You keep scrolling. Near the bottom of the feed, a single post. Short. No thread.\n\nSubject: for anyone arriving this fall\n\n\"If you're reading this and the dates don't make sense, you're in the right place. There are more of us than you think but fewer than you'd hope. Keep coming back. The terminal remembers you even if nobody else does.\"\n\nThe cursor blinks. The fluorescent tubes buzz. Somewhere upstairs, a class lets out and footsteps move across the ceiling like weather.",
    "micro_choices": [
      {
        "id": "read_again",
        "label": "Read it again.",
        "next": "read_again"
      },
      {
        "id": "look_more",
        "label": "Look for more.",
        "next": "look_for_more"
      },
      {
        "id": "log_off",
        "label": "Log off. You need air.",
        "next": "log_off_shaken"
      }
    ]
  },
  {
    "id": "read_again",
    "text": "You read it three times. The syntax is plain. The meaning is a door standing open in a room you thought had no doors. More of us. Someone wrote this knowing someone like you would sit at a terminal like this and need exactly these words.\n\nThe grad student coughs. You've been here forty minutes.",
    "next": "more_posts_hint"
  },
  {
    "id": "look_for_more",
    "text": "You scroll deeper. Most of it is noise — compiler arguments, campus gripes, jokes. But you're reading differently now. Two more posts catch your eye:\n\nOne, in a thread about campus jobs: \"Dining hall shifts are a time sink. If Harwick has a business school, find whoever runs the practicum. That's where the real education is.\"\n\nAnother, buried in net.misc, no replies: \"If anyone at a school with a campus radio station reads this — check in after 9 PM on weeknights. It's a good place to not be overheard.\"",
    "sets_flag": "read_outward_leads",
    "next": "more_posts_hint"
  },
  {
    "id": "log_off_shaken",
    "text": "You type logout and the screen goes back to amber nothing. Your hands are steady but something behind your ribs is not. The walk up the stairs feels different from the walk down. Whitmore Hall has lecture halls and corkboard and normal people heading to their normal Tuesday, and you are carrying something that changes the shape of every hallway you'll walk through from now on.",
    "next": "choices"
  },
  {
    "id": "more_posts_hint",
    "text": "The grad student looks at the clock. \"Lab closes in twenty.\" You log off. The screen returns to amber nothing.\n\nOn the way up the stairs, the regular world reassembles itself — voices, daylight, a guy asking someone to hold the door. But you know you're coming back. The terminal has more to say, and the people on the other end of those posts are out there somewhere, living the same doubled life.",
    "next": "choices"
  }
]
```

### Terminal Choices
```json
[
  {
    "id": "leave_terminal",
    "label": "Head back to the dorm",
    "time_cost": 1,
    "energy_cost": 1,
    "identity_tags": ["risk", "achieve"],
    "outcome": {
      "text": "The afternoon is gone. Whatever else was happening today happened without you.",
      "deltas": { "energy": -5 }
    },
    "set_npc_memory": {
      "npc_contact_glenn": { "found_terminal": true }
    }
  },
  {
    "id": "turned_away_leave",
    "label": "Come back another day",
    "time_cost": 0,
    "energy_cost": 0,
    "condition": { "flag": "mc_turned_away_reached" },
    "identity_tags": [],
    "outcome": {
      "text": "The terminals hum behind you as you climb the stairs. Whatever's on them, it'll keep.",
      "deltas": {}
    }
  }
]
```

### System Effects Summary
- If accessed: `found_terminal` = true, `terminal_visit_count` = 1
- If `look_for_more` chosen: `read_outward_leads` = true (player saw the radio station and business school leads)
- Opportunity track state → `discovered`
- If turned away (no Glenn phrase and chose wrong option): no terminal access, must return later

### Miss Path
Player never visits the terminal. The opportunity track stays at `noticed` (Glenn encounter happened). Outward-pull leads (professor, radio station, money mentor) are only discoverable through organic life-sim encounters, without the network's framing. The doubled life stays private and unconfirmed.

---

## Storylet 3: `glenn_the_walk`

### Metadata
```yaml
slug: glenn_the_walk
title: The Walk
track: opportunity
storylet_key: glenn_the_walk
segment: morning
due_offset_days: 5
expires_after_days: 7
time_cost_hours: 0
is_active: true
introduces_npc: []
default_next_key: null
tags: ["opportunity", "frame_story", "glenn"]
requirements:
  requires_flag: "found_terminal"
  requires_min_terminal_visits: 2
  # Code decides best implementation for the visit-count gate
weight: 100
```

### Body (Preamble)
```
Crossing the quad before nine. The grass is still wet. Someone falls into step beside you — close enough that you register the corduroy before you register the face. Glenn. No guitar today. Hands in his pockets. Walking your pace like he's been doing it all semester.

"You found it." Not a question.
```

### Nodes

```json
[
  {
    "id": "glenn_opens",
    "text": "He doesn't slow down or look at you directly. Walks and talks, like two people heading the same direction who happen to know each other.\n\n\"What'd you make of it?\"",
    "speaker": "npc_contact_glenn",
    "micro_choices": [
      {
        "id": "ask_people",
        "label": "\"Who are those people on the network?\"",
        "next": "thread_people",
        "sets_flag": "chose_people"
      },
      {
        "id": "ask_anomaly",
        "label": "\"Some of those posts describe things that haven't happened yet.\"",
        "next": "thread_anomaly",
        "sets_flag": "chose_anomaly"
      },
      {
        "id": "ask_practical",
        "label": "\"One of them mentioned a professor. And a radio station.\"",
        "next": "thread_practical",
        "sets_flag": "chose_practical"
      }
    ]
  },
  {
    "id": "thread_people",
    "text": "\"People like us. Different schools. Different years. Some have been at this a while.\" He sidesteps a puddle without breaking stride. \"Not enough of them. And not organized. Yet.\"\n\nHe lets that word sit for a second.\n\n\"You're going to need people. Not just them — people here. Different circles. Someone who understands money. Someone who understands systems. Someone who'll show up at three in the morning when things go wrong.\" He glances sideways at you. \"Build wide. Not just deep.\"",
    "speaker": "npc_contact_glenn",
    "micro_choices": [
      {
        "id": "how_many",
        "label": "\"How many of us are there?\"",
        "next": "people_followup"
      },
      {
        "id": "let_land",
        "label": "Nod. Let it land.",
        "next": "glenn_closing"
      }
    ]
  },
  {
    "id": "people_followup",
    "text": "\"Don't know. More than ten. Fewer than a hundred.\" A beat. \"Maybe fewer than fifty. Hard to count when half of them aren't sure what they are yet.\"\n\nHe looks at the chapel passing on your left. \"Find the ones here. On your campus. That matters more right now than the ones on the network.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_closing"
  },
  {
    "id": "thread_anomaly",
    "text": "\"Good. You're reading carefully.\" He adjusts his pace as two students pass the other way. Waits until they're out of range.\n\n\"The broad strokes rhyme. The details don't.\" He says it like a rule he's recited before. \"You'll remember things that haven't happened. Some of them will happen close to how you remember. Most won't. The sports are scrambled. The elections go sideways. The stock prices — \" a short exhale that might be a laugh \" — forget it.\"\n\n\"What's reliable is patterns. How systems work. How power moves. How people make decisions under pressure. That stuff transfers. The specific predictions don't.\"",
    "speaker": "npc_contact_glenn",
    "micro_choices": [
      {
        "id": "whats_the_point",
        "label": "\"So what's the point of knowing?\"",
        "next": "anomaly_followup"
      },
      {
        "id": "let_settle",
        "label": "Let that settle.",
        "next": "glenn_closing"
      }
    ]
  },
  {
    "id": "anomaly_followup",
    "text": "\"The point is you understand why things happen, even when you can't predict what happens.\" He taps his temple once. \"That's what your classes are for. Not the grades. The frameworks. History. Economics. How groups form. How technology changes what's possible.\"\n\nA beat. \"Pay attention to the computers. There's a revolution coming and most people in this building think it's a fad.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_closing"
  },
  {
    "id": "thread_practical",
    "text": "\"You're already following the leads.\" There's something that might be approval in his voice, or might just be recognition. \"Good. Those posts aren't gospel — the people writing them are working from memory and memory lies. But the instincts are right.\"\n\nHe counts on his fingers without taking his hands from his pockets — a gesture that somehow works. \"Knowledge. People. Money. In that order, usually. But money comes up faster than you think. Figure it out before you need it, not after.\"",
    "speaker": "npc_contact_glenn",
    "micro_choices": [
      {
        "id": "ask_about_him",
        "label": "\"What about you? What are you studying?\"",
        "next": "practical_followup"
      },
      {
        "id": "keep_going",
        "label": "\"I'll keep going back to the terminal.\"",
        "next": "glenn_closing"
      }
    ]
  },
  {
    "id": "practical_followup",
    "text": "He almost smiles. \"Everything. But that's not advice — that's just what happens when you've been here long enough.\" A building is coming up on the left. He's going to peel off.\n\n\"Don't spend all your time in that basement. Live the life. Take the classes. Make the friends. The terminal's a window, not a room.\"",
    "speaker": "npc_contact_glenn",
    "next": "glenn_closing"
  },
  {
    "id": "glenn_closing",
    "text": "He slows half a step. You're near the east entrance to Whitmore and he's turning toward it.\n\n\"I won't be around much after this.\" He says it the way someone mentions the weather. \"You've got the terminal. You've got the leads. You don't need a tour guide.\"\n\nHe goes through the door and the quad is just a quad again — wet grass, brick buildings, someone's radio playing through a dorm window two floors up. You have seven minutes before Western Civ and you're standing on a path holding a conversation that no one else on campus would believe happened.",
    "next": "choices"
  }
]
```

### Terminal Choices
```json
[
  {
    "id": "get_to_class",
    "label": "Get to class",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": [],
    "outcome": { "text": "", "deltas": {} },
    "relational_effects": {
      "npc_contact_glenn": { "trust": 1 }
    },
    "sets_track_state": { "state": "pursuing" }
  }
]
```

### Directive Flags (set based on micro-choice path)
Code should map these from the micro-choice flags:
- `chose_people` → sets player flag `directive_people` → belonging + opportunity storylets get +10 weight
- `chose_anomaly` → sets player flag `directive_knowledge` → academic storylets get +10 weight
- `chose_practical` → sets player flag `directive_independence` → money track entry surfaces sooner

### System Effects Summary
- One directive flag set (exactly one of three)
- Glenn trust +1
- Opportunity track state → `pursuing`
- Glenn does NOT reappear in Arc One after this storylet

### Miss Path
If the player never accumulates 2+ terminal visits by Day 12, this storylet expires. Glenn's walk never happens. The directives never land explicitly, but the terminal posts contain the same advice in fragmented form. The player gets less clarity, more ambiguity. The game works — just differently.

---

## Chain / Pool Wiring

```
glenn_pastime_paradise (Day 0, afternoon, opportunity track entry — default_next_key: NULL)
    ↓ sets flags, opportunity track enters pool mode

terminal_first_visit (Day 1+, afternoon, POOL — gated by glenn_gave_direction flag)
    ↓ (standalone — returns to pool after completion)

[future: terminal_return_visit_N pool storylets gated by visit count — separate content task]

glenn_the_walk (Day 5+, morning, POOL — gated by found_terminal + 2 visits)
    ↓ (standalone — sets directive, opportunity track → pursuing)
```

Beat 1 is the opportunity track entry point with `default_next_key: NULL`. After it fires, the opportunity track enters pool mode — the engine scans for pool storylets whose gates are met. The evening_choice storylet fires independently on the belonging track; no cross-track chain needed. Beats 2 and 3 are pool-mode and surface when their flags are satisfied.

**CORRECTION (2026-04-03):** Original brief specified `default_next_key: evening_choice` which violates CONTENT-RULES Rule 3 (cross-track chain fails silently). Code should set this to NULL in the migration if not already done.

---

## NPC Update: npc_contact_glenn

Update `NPC_DATA_REFERENCE.md`:
```
| npc_contact_glenn | Glenn | contact | Day 0 afternoon (chapel bench — glenn_pastime_paradise) |
```

Starting values: met=false (set true by Beat 1), knows_name=false (Glenn never gives his name in Arc One), knows_face=false (set true by Beat 1), relationship=5, trust=0 (incremented to 1 by Beat 3).

---

## Collision Notes for Code

Beat 1 (Day 0 afternoon) collides with: admin errands, bookstore, any afternoon belonging content. This is correct — the player might miss Glenn because they chose to do something practical. The miss path handles this.

Beat 2 (any afternoon/evening after Day 1) collides with: study sessions, social activities, everything. This is the point — the terminal always costs you something.

Beat 3 (Day 5+ morning) is zero-cost so it doesn't steal a slot, but it occupies the player's attention right before class. No mechanical collision, but narrative weight.
