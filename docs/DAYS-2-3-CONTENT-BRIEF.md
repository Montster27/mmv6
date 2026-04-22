# Days 2–3 Content Brief — Code-Ready Spec

> **For Claude Code.** This document contains everything needed to create a SQL migration
> adding 10 new storylets for Days 2–3 of Arc One. Follow the existing migration pattern.
> All storylet data matches the schema used by `lunch_floor`, `scott_day2_morning`, etc.

## Track IDs (use these in INSERT)

```
academic  = '0d3659f4-d457-4251-841e-f96a83aa0f9d'
belonging = 'be972bf2-3d74-496c-aac3-49ae041d1192'
roommate  = 'e40e9452-c2e4-47e5-bc64-210e5233a955'
money     = 'bc2dfe37-232a-4175-a955-27276c358df1'
```

## Arc ID

Use the same arc_id as existing Day 0–1 storylets. Query:
```sql
SELECT DISTINCT arc_id FROM storylets WHERE storylet_key = 'room_214';
```

---

## STORYLET 1: `western_civ_day1`

- **Title:** "Whitmore 203"
- **Track:** academic
- **Segment:** morning
- **due_offset_days:** 2
- **expires_after_days:** 1
- **time_cost_hours:** 2
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'academic', 'day2', 'class']`
- **introduces_npc:** `['npc_prof_western_civ']`
- **requirements:** `{}`

### Body

```
The building smells like floor wax and chalk. Whitmore 203 is a lecture hall — tiered wooden seats that fold up with a thunk, a long blackboard at the front, fluorescent lights that turn everyone slightly green. The clock above the door is three minutes fast.

You find a seat. The room fills around you in the way rooms fill when nobody knows anyone: people leaving empty seats between themselves like buffer zones, backpacks placed on chairs to claim territory, nobody sitting in the front row.

The professor arrives exactly on time with a briefcase and a thermos. He writes "WESTERN CIVILIZATION: AN INTRODUCTION" on the board in capital letters, turns around, and looks at the room like he's counting.
```

### Nodes

```json
[
  {
    "id": "seating",
    "text": "You're in the middle section, third row from the back. Close enough to read the board, far enough to feel anonymous. The seats around you are filling in.",
    "micro_choices": [
      {
        "id": "sit_front",
        "next": "lecture_begins",
        "label": "Move to the front row",
        "sets_flag": "sat_front_western_civ"
      },
      {
        "id": "stay_middle",
        "next": "lecture_begins",
        "label": "Stay where you are",
        "sets_flag": "sat_middle"
      },
      {
        "id": "slide_back",
        "next": "lecture_begins",
        "label": "Slide back another row",
        "sets_flag": "sat_back"
      }
    ]
  },
  {
    "id": "lecture_begins",
    "next": "lecture_midpoint",
    "text": "\"This course covers roughly four thousand years of human civilization in fifteen weeks.\" He pauses. \"We will not be thorough.\" A few people laugh. He wasn't joking.\n\nHe starts talking about Mesopotamia. The words are familiar in the way a song you've heard before is familiar — you know the shape but not the specifics. The classroom settles into the rhythm of someone who has given this lecture many times. Pens move. Pages turn. Someone behind you unwraps a cough drop loudly."
  },
  {
    "id": "lecture_midpoint",
    "next": "choices",
    "text": "Halfway through, you notice the student two seats to your left. She's not just taking notes — she's underlining things in the textbook, cross-referencing, writing in the margins. Her handwriting is small and precise.\n\nThe professor assigns the first reading: Chapter 1, pages 1-38. \"For Wednesday.\" He says it like it's obvious that you already have the textbook."
  }
]
```

### Choices

```json
[
  {
    "id": "stay_after",
    "label": "Stay after to look at the syllabus posted on the door",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["achievement"],
    "reaction_text": "You read the syllabus tacked outside the door. Three papers, a midterm, a final. The reading list is long — twelve books, most of them with \"A History of\" in the title. The student with the precise handwriting is reading it too. She catches your eye. \"You get the textbook yet?\" You haven't. \"Bookstore line's insane. Try the used rack on the second floor — they don't advertise it.\"",
    "sets_flag": ["checked_syllabus", "met_studious_classmate"],
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "leave_quickly",
    "label": "Pack up and head out while the room's still moving",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety"],
    "reaction_text": "You join the stream of people funneling through the door. The hallway is loud with the shuffle of two hundred students who all got out at the same time. Someone's already complaining about the reading. \"Thirty-eight pages? For the first class?\" They say it like it's unreasonable. It might be.",
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "try_to_talk_neighbor",
    "label": "Turn to the note-taker next to you — \"Is it always this fast?\"",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["people"],
    "reaction_text": "She looks up. Blinks. \"I think so. My sister took this two years ago — she said Moretti doesn't slow down.\" She caps her pen, a blue felt-tip. \"I'm Karen.\" She says her name like she's checking a box. Not unfriendly — efficient.\n\nYou tell her yours. She writes it in the margin of her notebook, next to the date, like you're a fact worth recording.",
    "sets_flag": ["met_karen"],
    "introduces_npc": ["npc_herald_karen"],
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 2: `bookstore_line`

- **Title:** "The Line"
- **Track:** money
- **Segment:** afternoon
- **due_offset_days:** 2
- **expires_after_days:** 2
- **time_cost_hours:** 1
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'money', 'day2']`
- **requirements:** `{}`

### Body

```
The bookstore line starts at the register and ends somewhere outside. Forty, fifty people deep, snaking through aisles of sweatshirts and coffee mugs with the Harwick crest. The textbook section is in the back — cardboard boxes stacked on metal shelves, organized by department and course number.

You find the Western Civ reader. Used copy, spine already cracked, someone else's highlighter marks in yellow and pink. The price sticker says $31. The new one is $47.

Your checking account has what your parents deposited in August. You haven't done the math yet on how long it needs to last.
```

### Nodes

```json
[
  {
    "id": "price_check",
    "text": "You stack the books you need. Western Civ reader. A lab notebook for Bio 101, shrink-wrapped. A course packet for English Comp — photocopied pages bound with a plastic spine, $12, which feels like a lot for someone else's copies.\n\nThe guy ahead of you in line has a calculator. He's adding up his stack. When he sees the total he puts one book back on the shelf and doesn't look at it again.",
    "micro_choices": [
      {
        "id": "buy_all",
        "next": "register",
        "label": "Keep everything. You'll figure it out.",
        "sets_flag": "bought_all_books"
      },
      {
        "id": "skip_one",
        "next": "register",
        "label": "Put the new reader back. Keep the used one.",
        "sets_flag": "bought_used"
      },
      {
        "id": "just_essentials",
        "next": "register",
        "label": "Just the reader and the lab notebook. Skip the rest for now.",
        "sets_flag": "bought_minimal"
      }
    ]
  },
  {
    "id": "register",
    "next": "choices",
    "text": "The register. The cashier doesn't look at you. She scans, bags, reads the total like a bus announcement. You write a check — the pen chained to the counter, the check from a book your mother ordered from the bank in August. Your handwriting looks wrong on a check. Too young for the form."
  }
]
```

### Choices

```json
[
  {
    "id": "check_balance",
    "label": "Walk to the bank branch on College Ave to check your balance",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["safety"],
    "reaction_text": "The bank is a ten-minute walk. The teller counts out your balance on a slip of paper. The number is specific and finite and smaller than you pictured. You fold the slip into your back pocket. It sits there for the rest of the day like a note from someone who doesn't trust you.",
    "sets_flag": ["checked_balance"],
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "dont_check",
    "label": "Head back to the dorm. You'll deal with it later.",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["avoid"],
    "reaction_text": "You carry the bag across campus. The books are heavier than they should be, digging into your fingers through the plastic. You pass two guys playing frisbee on the quad. One of them is barefoot. You don't know how anyone can be that relaxed during the first week.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 3: `floor_lunch_day2`

- **Title:** "Trays Again"
- **Track:** belonging
- **Segment:** afternoon
- **due_offset_days:** 2
- **expires_after_days:** 1
- **time_cost_hours:** 1
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'belonging', 'day2']`
- **requirements:** `{}`

### Body

```
The dining hall, day two. You know where the trays are now. You know the coffee is bad. You know the brownies are the safest dessert. Small knowledge, but it makes the room feel less foreign.

Doug waves you over. He's already eating, tray loaded — two plates, a glass of milk, a glass of juice. Keith is across from him, working through a sandwich he built from the salad bar fixings. Mike is reading a paperback with one hand and eating with the other. Scott is at the end, quiet, methodical.
```

### Nodes

```json
[
  {
    "id": "evening_callback",
    "text": "Doug leans across the table. \"Dude.\" He's looking at you.",
    "micro_choices": [
      {
        "id": "engaged_callback",
        "next": "doug_remembers",
        "label": "\"What?\"",
        "condition": {"requires_flag": "chose_party"}
      },
      {
        "id": "cards_callback",
        "next": "keith_remembers",
        "label": "\"What?\"",
        "condition": {"requires_flag": "chose_cards"}
      },
      {
        "id": "arcade_callback",
        "next": "no_callback",
        "label": "\"What?\"",
        "condition": {"requires_flag": "chose_arcade"}
      },
      {
        "id": "generic_callback",
        "next": "no_callback",
        "label": "\"What?\""
      }
    ]
  },
  {
    "id": "doug_remembers",
    "next": "table_talk",
    "text": "\"Anderson Hall, man. That was something.\" Doug grins. \"You see that guy try to do a keg stand on the porch? Campus security showed up and he just — kept going.\" He mimes someone upside down. Keith looks mildly disgusted.\n\n\"You were there?\" Mike looks up from his book. Something recalibrates behind his eyes."
  },
  {
    "id": "keith_remembers",
    "next": "table_talk",
    "text": "Keith nods at you. Just once. \"Good game last night.\" That's all he says about it. Doug looks between you two. \"What game? Where?\"\n\n\"Cards,\" Keith says. \"In the lounge.\"\n\n\"Cards,\" Doug repeats, like it's a word from another language."
  },
  {
    "id": "no_callback",
    "next": "table_talk",
    "text": "\"Never mind. You had to be there.\" Doug goes back to his chicken. The moment passes. You missed something last night that Doug remembers and you don't. That's fine. That's how it works now — the floor is generating shared memories and you're not in all of them."
  },
  {
    "id": "table_talk",
    "next": "choices",
    "text": "Mike puts his book down. \"Anyone got Moretti for Western Civ?\" A few nods. \"Chapter one for Wednesday. Thirty-eight pages.\"\n\n\"It's the first week,\" Doug says. \"Nobody does the reading the first week.\"\n\nMike picks the book back up. \"I do.\"\n\nScott doesn't say anything. He finishes his food, stacks his plates neatly, and waits for everyone else like someone who was taught that you don't leave the table first."
  }
]
```

### Choices

```json
[
  {
    "id": "walk_back_with_doug",
    "label": "Walk back to the dorm with Doug",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["people"],
    "reaction_text": "Doug talks the whole way back. About the party. About a girl he saw. About his high school football team. He talks like breathing — not because he needs you to respond, but because silence makes him itchy. You learn more about him in ten minutes than you've learned about Scott in two days.",
    "events_emitted": [{"type": "SHARED_WALK", "npc_id": "npc_floor_doug", "magnitude": 1}],
    "precludes": []
  },
  {
    "id": "walk_back_with_mike",
    "label": "Fall in step with Mike",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["achievement"],
    "reaction_text": "Mike walks like he's going somewhere specific even when he isn't. You match his pace. He asks what you thought of Moretti's lecture — not small talk, an actual question. When you answer he listens, then says, \"I think he's going to be good. Demanding, but good.\" He says it like someone who's been waiting for demanding.",
    "events_emitted": [{"type": "SHARED_WALK", "npc_id": "npc_floor_mike", "magnitude": 1}],
    "precludes": []
  },
  {
    "id": "head_out_alone_lunch",
    "label": "Clear your tray and head to the bookstore",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["achievement"],
    "reaction_text": "You bus your tray and leave before the group dissolves. Nobody notices exactly, but someone will remember you left first. The bookstore is across the quad and the line is visible from here — it hasn't gotten shorter.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 4: `reading_or_lounge`

- **Title:** "Chapter One"
- **Track:** academic
- **Segment:** evening
- **due_offset_days:** 2
- **expires_after_days:** 1
- **time_cost_hours:** 2
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** true
- **tags:** `['arc_one', 'academic', 'belonging', 'day2', 'collision']`
- **requirements:** `{}`

### Body

```
The room is quiet. Scott is at his desk — headphones on, the cord trailing to the cassette player. Through the window the campus is turning blue in the early dark.

The Western Civ reader is on your desk. Chapter One: "The Fertile Crescent and the Birth of Cities." Thirty-eight pages. Someone's already highlighted the used copy — yellow for definitions, pink for names, which is helpful until it isn't.

Down the hall, you can hear the lounge TV and people's voices folding over each other. Someone laughs. The floor is gathering in there without deciding to — it just happens, the way water finds its level.
```

### Choices

```json
[
  {
    "id": "do_the_reading",
    "label": "Open the book. Start reading.",
    "time_cost": 2,
    "energy_cost": 1,
    "identity_tags": ["achievement"],
    "reaction_text": "You read. Hammurabi's Code. The invention of writing as accounting — keeping track of grain, not poetry. The first cities as organizational problems. It's not exciting but it's real, and by page twenty you're underlining things without the highlighter, just pressing the pen harder.\n\nScott takes his headphones off around page thirty. Looks at you. \"You're actually doing it.\" Not impressed exactly. More like he's filing the information.\n\n\"The reading?\"\n\n\"First week.\" He puts the headphones back on.\n\nYou finish at eleven. The lounge is quiet by then. Whatever happened in there, you missed it. The hallway smells like microwave popcorn and someone's cologne.",
    "sets_flag": ["did_reading"],
    "practices_skills": ["study_discipline"],
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "go_to_lounge",
    "label": "Close the book. Go see who's out there.",
    "time_cost": 2,
    "energy_cost": 0,
    "identity_tags": ["people"],
    "reaction_text": "The lounge is five guys and a TV nobody's really watching. Doug is holding court about something. Keith is on the couch, legs up on the arm, flipping through a magazine he found somewhere. Peterson is trying to explain the rules of a card game nobody asked to learn.\n\nYou sit down and the room adjusts. Doug makes space. Keith nods. It's the easiest social act in the world — showing up to the place where people already are.\n\nTwo hours go by without you deciding they should. The Western Civ reader stays on your desk, page one, where you left it.",
    "sets_flag": ["skipped_reading", "lounge_day2"],
    "events_emitted": [
      {"type": "SHOWED_UP", "npc_id": "npc_floor_doug", "magnitude": 1},
      {"type": "SHOWED_UP", "npc_id": "npc_floor_keith", "magnitude": 0.5}
    ],
    "precludes": []
  }
]
```

---

## STORYLET 5: `second_morning_class`

- **Title:** "The Name on the Board"
- **Track:** academic
- **Segment:** morning
- **due_offset_days:** 3
- **expires_after_days:** 1
- **time_cost_hours:** 2
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'academic', 'day3', 'class', 'consequence']`
- **requirements:** `{}`

### Body

```
Different building, different room. This one is smaller — twenty-five desks arranged in a U-shape, which means the professor can see everyone and everyone can see each other. English Composition. The professor is younger than Moretti, dark hair pulled back, glasses on a chain around her neck that she puts on and takes off like punctuation.

She writes on the board: "Why does anyone write anything?"

Then she turns around and waits.
```

### Nodes

```json
[
  {
    "id": "the_question",
    "text": "The room is silent. The question sits there. Twenty-four people doing the math on whether speaking first is brave or stupid.\n\nSomeone in the front answers — something about communication, self-expression. The professor nods. Doesn't agree or disagree. She writes the answer on the board and asks for another.",
    "micro_choices": [
      {
        "id": "offer_answer",
        "next": "spoke_up",
        "label": "\"To figure out what you think.\"",
        "sets_flag": "spoke_in_class"
      },
      {
        "id": "stay_quiet_class",
        "next": "stayed_quiet_class",
        "label": "Stay quiet. Watch the board fill up."
      }
    ]
  },
  {
    "id": "spoke_up",
    "next": "reading_check",
    "text": "She looks at you. Writes it on the board. Doesn't comment, but the way she underlines it is different from how she underlined the others. You can't tell if that's good or if you're reading into chalk.\n\nThe guy next to you glances over. Not hostile. Curious. Like you did something he was thinking about doing."
  },
  {
    "id": "stayed_quiet_class",
    "next": "reading_check",
    "text": "The board fills with answers. Communication. Legacy. Money. Boredom. The professor writes them all without ranking them. \"Good,\" she says. \"You'll disagree with half of these by December.\"\n\nYou didn't speak. You know why, and the reason is more complicated than shyness. You were composing an answer in your head — a good one — and by the time you had it, the conversation had moved."
  },
  {
    "id": "reading_check",
    "next": "choices",
    "text": "She mentions Moretti's Western Civ reading. \"Some of you share that class. If you've done the reading\" — she looks around like she already knows who has — \"you'll notice something about how Mesopotamians used writing. It wasn't literature. It was inventory. Lists of grain. Debts. Laws. Writing began as accounting.\"\n\nYou either know this because you read it last night, or you don't."
  }
]
```

### Choices — CONDITIONAL on `did_reading` flag

```json
[
  {
    "id": "reading_connected",
    "label": "Nod — you read that section last night",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["achievement"],
    "requires_flag": "did_reading",
    "reaction_text": "The connection lands. You read it, and now someone is using it, and the two classes link up in your head like they were designed to. They probably were — faculty talk to each other.\n\nThe girl from Western Civ — Karen, if you met her — catches your eye across the U-shape. The smallest nod. She read it too.",
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "reading_gap",
    "label": "Look at your desk. You didn't do the reading.",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["avoid"],
    "excludes_flag": "did_reading",
    "reaction_text": "The reference floats past you. Other people are nodding. The student to your left has the textbook open to the right page. You don't have the textbook because you haven't been to the bookstore, or you do but you didn't open it because last night the lounge was easier.\n\nIt's not humiliation. It's a gap — the space between people who prepared and people who didn't, and in this room, with these small desks in a U-shape, the gap is visible.",
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "reading_bluff",
    "label": "Half-nod — act like you remember it",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["risk"],
    "excludes_flag": "did_reading",
    "reaction_text": "You nod. It's not a lie exactly — you've heard of Mesopotamia, you know what grain is, the rest is context. The professor doesn't call on you. Nobody tests the nod. But you know, and that small knowledge sits in your chest like a coin you shouldn't have picked up.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 6: `hallway_morning_day3`

- **Title:** "Third Floor"
- **Track:** belonging
- **Segment:** morning
- **due_offset_days:** 3
- **expires_after_days:** 1
- **time_cost_hours:** 0
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'belonging', 'day3', 'texture']`
- **requirements:** `{}`

### Body

```
The hallway, 8:15 AM. Doors opening and closing. Someone's shower is still running. The bulletin board by the stairs has a sign-up sheet for intramural volleyball that nobody has signed.
```

### Nodes

```json
[
  {
    "id": "hallway_pass",
    "text": "Doug comes out of his room pulling a t-shirt over his head. He sees you and does the chin-nod — the one that means acknowledgment without commitment.",
    "micro_choices": [
      {
        "id": "lounge_callback",
        "next": "lounge_reference",
        "label": "\"Hey. Good time last night.\"",
        "condition": {"requires_flag": "lounge_day2"}
      },
      {
        "id": "just_nod",
        "next": "just_pass",
        "label": "Nod back. Keep walking."
      }
    ]
  },
  {
    "id": "lounge_reference",
    "next": "choices",
    "text": "\"Yeah man. Peterson's face when he lost that hand —\" Doug mimes an expression of theatrical outrage. He's already laughing at his own memory. \"You coming tonight? Same thing, probably.\"\n\nHe says it like the lounge is already a tradition. It's been two nights."
  },
  {
    "id": "just_pass",
    "next": "choices",
    "text": "You pass each other. The hallway is wide enough for two people but Doug still turns sideways, a habit from somewhere smaller. The stairwell door bangs shut behind him.\n\nThe floor is waking up. You're part of it now, or adjacent to it. The difference is smaller than you think."
  }
]
```

### Choices

```json
[
  {
    "id": "head_to_class_day3",
    "label": "Head to class",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": [],
    "reaction_text": "You take the stairs two at a time. The morning air outside is cooler than you expected — September pretending it's still August but not quite pulling it off.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 7: `study_group_forming`

- **Title:** "The Margin Notes"
- **Track:** academic
- **Segment:** afternoon
- **due_offset_days:** 3
- **expires_after_days:** 2
- **time_cost_hours:** 1
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'academic', 'day3', 'study_group']`
- **requirements:** `{}`

### Body

```
The library is new to you. Four floors of stacks, study carrels along the windows, the particular silence of a building where everyone is pretending to work. Second floor, the tables near the periodicals. Three students from Western Civ have pushed two tables together and spread out their notes.

One of them looks up when you approach. "You're in Moretti's nine o'clock?" Not unfriendly. Assessing.
```

### Nodes

```json
[
  {
    "id": "join_or_not",
    "text": "There's an empty chair. The textbook is open to Chapter One. Someone has already outlined the key points on a legal pad — numbered, with sub-points. They're ahead of you, or they're at the same place and just more organized.",
    "micro_choices": [
      {
        "id": "sit_and_contribute",
        "next": "study_active",
        "label": "Sit down. Pull out your notes.",
        "sets_flag": "joined_study_group",
        "condition": {"requires_flag": "did_reading"}
      },
      {
        "id": "sit_and_listen",
        "next": "study_passive",
        "label": "Sit down. Listen first.",
        "sets_flag": "joined_study_group"
      },
      {
        "id": "keep_walking",
        "next": "choices",
        "label": "Keep walking. You'll figure it out yourself."
      }
    ]
  },
  {
    "id": "study_active",
    "next": "choices",
    "text": "You open the reader to your underlines. Hammurabi's Code, the grain accounting, the difference between writing and literature. You say something about the inventory point — that writing started as bureaucracy, not art — and the guy with the legal pad writes it down.\n\n\"Good. That's the thesis of the chapter. Moretti's going to build on that.\"\n\nFor an hour, you trade observations. It's not socializing and it's not pure studying — it's the thing in between, where ideas have social weight. You leave knowing the material better and knowing three people's names."
  },
  {
    "id": "study_passive",
    "next": "choices",
    "text": "You listen. They're comparing notes, debating whether Moretti emphasized the legal codes or the agricultural systems. You haven't done the reading, or you have but didn't take notes, and either way you're behind the conversation.\n\nBut you're here. And being here counts for something — the next time they meet, they'll remember you showed up. The student with the legal pad glances at you once, not unkindly. \"You'll catch up. Everyone's figuring it out.\""
  }
]
```

### Choices

```json
[
  {
    "id": "stay_and_review",
    "label": "Stay at the library to keep studying",
    "time_cost": 1,
    "energy_cost": 1,
    "identity_tags": ["achievement"],
    "reaction_text": "They leave after an hour. You stay. The library is different when it's just you — the silence stops being communal and starts being private. You read another twenty pages. Some of it sticks. Some of it slides. But the chair is comfortable and the light through the window is good and for an hour, college feels like the thing it's supposed to be.",
    "sets_flag": ["extra_study"],
    "practices_skills": ["study_discipline"],
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "head_back_to_dorm",
    "label": "Head back to the dorm",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": [],
    "reaction_text": "You pack up and walk back across the quad. The afternoon light is doing the thing where it makes every brick building look like a postcard. Two people are throwing a football. A girl is reading on the grass with her shoes off. It looks like a brochure and you're in it now.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 8: `miguel_afternoon_day3`

- **Title:** "The Map"
- **Track:** belonging
- **Segment:** afternoon
- **due_offset_days:** 3
- **expires_after_days:** 1
- **time_cost_hours:** 0
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'belonging', 'day3', 'texture', 'miguel']`
- **requirements:** `{}`

### Body

```
Miguel is in the common room with a campus map unfolded on the table, the kind they hand out at orientation — glossy, with tiny numbers keyed to a legend on the back. He's tracing a route with his finger and frowning.
```

### Nodes

```json
[
  {
    "id": "miguel_map",
    "text": "He looks up. \"Hey — you know where Kendall Hall is? I've got a thing there at three and this map makes it look like it's in the parking lot.\"",
    "micro_choices": [
      {
        "id": "help_miguel",
        "next": "helped",
        "label": "Look at the map with him",
        "sets_flag": "helped_miguel_map",
        "relational_effect": {"npc_floor_miguel": {"relationship": 1}}
      },
      {
        "id": "dont_know",
        "next": "passed",
        "label": "\"No idea. I'm still figuring it out too.\""
      }
    ]
  },
  {
    "id": "helped",
    "next": "choices",
    "text": "You lean over the map. Kendall is the building behind the library — you passed it this morning. You point. Miguel traces the route, nodding.\n\n\"Thanks. Hey, some of us are doing a thing this weekend — Danny's idea, pickup basketball at the gym. You play?\" He asks it like he asks everything, open-ended, no pressure.\n\nHe folds the map wrong. Twice. Gives up and stuffs it in his back pocket."
  },
  {
    "id": "passed",
    "next": "choices",
    "text": "\"Yeah, this place is designed by someone who hates people.\" He laughs at his own joke, full and immediate. \"Alright, I'll find it. See you around.\"\n\nHe folds the map into something that isn't a fold and heads out. The common room is quiet again."
  }
]
```

### Choices

```json
[
  {
    "id": "miguel_done",
    "label": "Head to your room",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": [],
    "reaction_text": "The common room empties. Someone left a newspaper on the table — the campus paper, four pages, headline about parking permits. You glance at it without reading it.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## STORYLET 9: `roommate_evening_day3`

- **Title:** "The Ordinary Evening"
- **Track:** roommate
- **Segment:** evening
- **due_offset_days:** 3
- **expires_after_days:** 2
- **time_cost_hours:** 1
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** false
- **tags:** `['arc_one', 'roommate', 'day3', 'scott']`
- **requirements:** `{}`
- **NOTE:** This replaces the existing `roommate_moment` storylet. Deactivate `roommate_moment` and insert this one fresh.

### Body

```
Scott is at his desk. Not studying — writing something on a legal pad with the concentrated posture of someone who doesn't want to be asked about it. The cassette player is off. The room is quiet in the way rooms are quiet when someone is doing something private in a shared space.

His desk lamp makes a circle of warm light. Everything outside it is dimmer.
```

### Nodes

```json
[
  {
    "id": "notice_writing",
    "text": "He hasn't looked up since you came in. The pen moves in short bursts — write a few words, stop, cross something out, write again. Not homework. The handwriting is the same careful print from the note he left you yesterday.",
    "micro_choices": [
      {
        "id": "ask_about_it",
        "next": "asked",
        "label": "\"Writing home?\"",
        "sets_flag": "asked_scott_about_letter"
      },
      {
        "id": "give_space",
        "next": "gave_space",
        "label": "Put on your headphones. Give him the room.",
        "sets_flag": "gave_scott_space"
      },
      {
        "id": "mention_floor",
        "next": "mentioned_floor",
        "label": "\"Some guys are in the lounge if you want to come.\""
      }
    ]
  },
  {
    "id": "asked",
    "next": "choices",
    "text": "He puts the pen down. Not startled — more like he was waiting for you to ask and now you have.\n\n\"My brother.\" Pause. \"He's got his own place now. First one in the family.\" Another pause. \"I don't know what to say to him. 'How's college' is what people ask me and I don't have an answer yet, so.\"\n\nHe picks up the pen again. Then puts it down.\n\n\"How do you describe this?\" He gestures at the room, the building, the everything. \"To someone who isn't here?\"",
    "speaker": "npc_roommate_scott",
    "set_npc_memory": {"npc_roommate_scott": {"mentioned_brother": true}}
  },
  {
    "id": "gave_space",
    "next": "choices",
    "text": "You put on your headphones. The tape is where you left it — middle of side B. The music fills the space between you. Scott writes. You exist in the same room without being in the same room. It's not loneliness. It's the negotiated privacy of shared space, and tonight it works.\n\nAfter a while he folds the paper and puts it in an envelope. Doesn't seal it. Puts it in his desk drawer."
  },
  {
    "id": "mentioned_floor",
    "next": "choices",
    "text": "He looks up. Considers it the way he considers everything — fully, like there's a calculation happening.\n\n\"Maybe later.\" He doesn't mean later. He means no, but 'no' is too definitive for someone who leaves doors open by habit.\n\nHe goes back to the letter. You stand in the doorway for a second — the room behind you, the hallway ahead — and the choice is spatial before it's social.",
    "speaker": "npc_roommate_scott"
  }
]
```

### Choices

```json
[
  {
    "id": "stay_in_room",
    "label": "Stay. Read, or just be here.",
    "time_cost": 1,
    "energy_cost": 0,
    "identity_tags": ["people"],
    "reaction_text": "You stay. Not talking, not performing presence — just existing in the same twelve-by-fourteen space. Scott finishes the letter. Seals the envelope. Writes an address in that same careful print.\n\nAt some point he says, \"Night,\" and turns off the desk lamp. You say it back. The room goes dark except for the light under the door from the hallway. It's the most normal thing that's happened in three days.",
    "events_emitted": [
      {"type": "SHOWED_UP", "npc_id": "npc_roommate_scott", "magnitude": 1},
      {"type": "QUIET_COMFORT", "npc_id": "npc_roommate_scott", "magnitude": 1}
    ],
    "precludes": []
  },
  {
    "id": "go_to_lounge_day3",
    "label": "Head to the lounge.",
    "time_cost": 1,
    "energy_cost": 0,
    "identity_tags": ["people"],
    "reaction_text": "The lounge has the same people as last night, minus one, plus two. The TV is on. Someone has cards out. The evening assembles itself from the same parts as yesterday, slightly rearranged. You're becoming a regular at something that didn't exist three days ago.",
    "sets_flag": ["lounge_day3"],
    "events_emitted": [
      {"type": "SHOWED_UP", "npc_id": "npc_floor_doug", "magnitude": 0.5}
    ],
    "precludes": []
  }
]
```

---

## STORYLET 10: `catch_up_or_coast`

- **Title:** "The Desk Lamp"
- **Track:** academic
- **Segment:** evening
- **due_offset_days:** 3
- **expires_after_days:** 1
- **time_cost_hours:** 2
- **default_next_key:** NULL
- **is_active:** true
- **is_conflict:** true
- **tags:** `['arc_one', 'academic', 'day3', 'collision']`
- **requirements:** `{"requires_flag": "skipped_reading"}`

### Body

```
The Western Civ reader is still on your desk. Page one. The bookmark someone else left in it — a receipt from a gas station in a state you've never been to — marks a spot you haven't reached.

Today in class, you felt the gap. Not a chasm. A step. The kind you can still close if you sit down tonight.

The lounge is audible through the wall.
```

### Choices

```json
[
  {
    "id": "catch_up_now",
    "label": "Open the book. Do the reading you missed.",
    "time_cost": 2,
    "energy_cost": 1,
    "identity_tags": ["achievement"],
    "reaction_text": "You read. Slowly at first — the prose is academic and dense, written for people who already care. But somewhere around page fifteen the content takes over. Writing as accounting. Cities as organizational problems. You're highlighting without deciding to.\n\nBy page thirty-eight you're tired but the gap is closed. You know what Moretti was talking about. You know what the composition professor was referencing. The two classes click together like puzzle pieces you didn't know were from the same box.\n\nThe lounge went quiet an hour ago. The hallway is dark. You did the thing you were supposed to do, a day late. It still counts.",
    "sets_flag": ["did_reading_late"],
    "practices_skills": ["study_discipline"],
    "events_emitted": [],
    "precludes": []
  },
  {
    "id": "skip_again",
    "label": "Close the book. There's always tomorrow.",
    "time_cost": 0,
    "energy_cost": 0,
    "identity_tags": ["avoid"],
    "reaction_text": "You put the book on the shelf above the desk. You'll do it tomorrow, or this weekend, or before the next class. The gap stays open. It's not getting bigger — not yet — but it's there, and you know it's there, and that knowledge has a weight that isn't in the syllabus.",
    "events_emitted": [],
    "precludes": []
  }
]
```

---

## Implementation Notes for Code

1. **Single SQL migration file.** Name: `YYYYMMDD_days_2_3_content.sql`
2. **Get arc_id** from existing storylets: `SELECT DISTINCT arc_id FROM storylets WHERE storylet_key = 'room_214';`
3. **Deactivate `roommate_moment`** — `UPDATE storylets SET is_active = false WHERE storylet_key = 'roommate_moment';` (it's already inactive, but confirm)
4. **`catch_up_or_coast` has a requirement:** `{"requires_flag": "skipped_reading"}` — it only appears if the player skipped reading on Day 2 evening. Players who did the reading don't see this storylet.
5. **`hallway_morning_day3` and `miguel_afternoon_day3`** are zero-cost texture beats — they fire alongside other content, not instead of it.
6. **`reading_or_lounge`** is the critical collision storylet — it's `is_conflict: true` and sets the `did_reading` / `skipped_reading` flags that Day 3 branches on.
7. **Conditional choices** in `second_morning_class` and `floor_lunch_day2` use `requires_flag` and `excludes_flag` — verify these match the existing schema pattern from `lunch_floor`.
8. **NPC references** use existing IDs: `npc_roommate_scott`, `npc_floor_doug`, `npc_floor_keith`, `npc_floor_mike`, `npc_floor_miguel`. New NPC `npc_herald_karen` is introduced conditionally in `western_civ_day1`.
9. **Run `end session` protocol when done.**
