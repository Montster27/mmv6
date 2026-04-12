<!-- mmv-lore-bible.md -->
# MMV Lore Bible
### Living reference document — update as content is authored

> **Purpose:** Single source of truth for NPCs, world rules, environment details, plot
> architecture, and narrative constraints. All content authors should read this before
> writing and update it after finalizing new content.

---

## 1. World Rules

### 1.1 Setting
- **Year:** Fall 1983
- **Location:** Harwick University (fictional; architecture suggests mid-Atlantic state school)
- **Time period texture:** The year lives in the *nouns* — objects, brands, physical media. Never narrate "it was the 1980s." Let the Farrah Fawcett poster and the Walkman and the waffle iron do the work.

### 1.2 The Time-Travel Frame
The player is a time traveler who returned to 1983 — doesn't fully understand why or how. Time travel is the **frame**, not the game — 95% of gameplay is life simulation starting in college and progressing for 60 years.

- This is NOT the history the player remembers — it's an **alternate timeline with anomalies**
- **Core rule: "The broad strokes rhyme. The details don't."** — future knowledge is useful but unreliable
- **Sports** are the clearest divergence signal (almost none go as expected)
- **Historical events** similar in shape but different in detail
- Prevents "replay history perfectly" exploit — every playthrough remains genuinely uncertain

### 1.3 The Memory Bleed
The player character carries fragmentary impressions from a future life; the bleed arrives uninvited, never controlled. A few people seem familiar, most are new. The bleed operates on a spectrum:

- **Vague end:** A feeling of confidence about a situation they've never been in. A sense that something will turn out fine.
- **Specific end:** Knowing the next four notes of a melody before they're hummed. Recognizing a song that hasn't been written yet.

**Rules for the bleed:**
- Never explained in-world during Arc One. Characters do not discuss "time travel."
- Glenn is the only NPC who acknowledges the bleed directly. He does so obliquely.
- The player cannot control when bleed happens. It arrives uninvited.
- Bleed creates *dissonance*, not confidence. Knowing something you shouldn't know is destabilizing.
- **Critical rule (from Glenn):** "The broad strokes rhyme. The details don't." Future-memories are unreliable.

### 1.4 The Guaranteed-Slip Principle
In any time slot, the player has more compelling options than they can pursue. Something always falls behind. This is not punishment. It is how life works.

### 1.5 The Investigation

Glenn gives directives but not explanations. The player is left to figure out, on their own, three linked questions that together form the arc-long investigation:

- **Why was I sent back?** — the motive question. Unanswerable in Arc One, but pressured constantly by the bleed.
- **What is the structure of the world?** — the mechanics question. How does the timeline actually work? What are its rules? Who can affect it?
- **What are my goals?** — the purpose question. Not "what do I want from college" but "what am I supposed to do with this."

None of these get answered in Arc One. They get **sharpened**. The investigation in the first month is not about discovery; it is about the player learning which questions to ask.

**Investigation is a shared space.** The ARPANET terminal in this game is a proto-Usenet where real players read and post. The dev team seeds threads — specific, researchable questions from people who appear to know more than a 1983 person should — and players gather around them to discuss, speculate, and piece together what went wrong and why. Investigation is never solitary. A Knower asks a question in public, and the answer arrives over days or weeks through the accumulated contributions of everyone reading.

**The content of the investigation is specific and researchable — not vibes.** Real things: Soviet grain dependency in 1983, Polish Solidarity's underground networks, the sustainability of Western Siberian oil production, the widening East-West computing gap, the hard currency crunch the Soviet economy was already feeling. The bleed gave Knowers the *fact* that the 20th century breaks in specific places. The investigation is about finding out *how* and *why*, with real data. Feelings of wrongness are seeding — the beats where the bleed meets reality and doesn't quite fit. The terminal is where those feelings become questions that can actually be answered.

**Modes of investigation in Arc One:**

- **The Terminal (ARPANET).** The player's main investigative tool and the shared space where Knowers find each other. Threads contain information, but they also contain voices, and voices reveal motives. A question about grain dependency phrased one way sounds like academic research. Phrased another way, it sounds like someone planning to profit from a shortage. Readers speculate about the askers as much as about the content.
- **Testing memory against reality.** The bleed delivers fragmentary future-memories. Some are right. Some are wrong. Some are right about the player's original timeline but wrong about this one. Every surprise is data. Sports results are the clearest divergence signal. Small news items — a minor accident, a political story that's almost-but-not-quite what the player remembers — are the most unsettling.
- **Oblique conversation with Glenn.** Glenn reappears briefly in Arc One but will not answer direct questions. He answers *adjacent* ones. The player's investigation is their own work; Glenn is a compass, not a map.

**The "find the others" directive operates through traces, not meetings.** In Arc One the player does not meet another Knower in person. They find evidence: a post that's too specific, a username that appears in places it shouldn't, a reply that lands too precisely on a question the player was also asking. Contact is a terminal choice — the decision to reply to a thread, to post a question of one's own, to mark one's own presence in the shared space. Payoff arrives in Arc Two.

**Groups exist but are not named.** By the end of Arc One the player will have seen that different Knowers are asking different kinds of questions, in different voices, with different apparent motives. Some seem to be trying to understand the cracks in order to help the system hold or reform it. Some seem to be trying to understand them in order to profit. Some are harder to read. The game does not label these positions or track them on the player. When the player eventually encounters organized groups (Arc Two and later), those groups read the player's actual history — what they posted, what they replied to, who they talked to, which questions they pursued, which they ignored — and respond accordingly. There is no hidden counter. There is only a trail.

---

## 2. NPCs

### 2.1 Glenn (The Contact)
- **Role:** Mysterious figure on a bench near the chapel. Appears Day 1.
- **Age appearance:** Everything says twenty-one except his eyes, which say older.
- **Clothing:** Corduroy jacket, sleeves pushed up. Sneakers that were white a long time ago.
- **Personality:** Measured. Says less than he knows. Speaks like someone giving directions in a foreign city.
- **NPC ID:** `npc_contact_glenn`
- **The reveal:** Humming "Gangsta's Paradise" (Coolio, 1995 — 12 years early) on the quad. Could be mistaken for "Pastime Paradise" by Stevie Wonder (1976). Song never named; player recognizes the melody; Glenn's reaction confirms.
- **Key traits:**
  - Knows about the memory bleed. Acknowledges it without naming it.
  - Four directives: people/circles, money/independence, knowledge/right classes, find the others/work together.
  - Warns: don't trust specific memories. Broad strokes rhyme, details don't.
  - Does NOT explain: how time travel works, how many others exist, who adversaries are, what the endgame is. The player is told this will be explained as time goes on.
  - **Will not answer direct questions about the frame.** Answers adjacent ones. Asking "why am I here" gets a shrug. Asking "how do you know what you know" may get a sentence. The player's investigation is their own work; Glenn is a compass, not a map.
- **Arc One appearances:** Day 1 bench encounter (built). Day 5+ "Glenn's Walk" beat (built, pool mode, gated by `found_terminal` + two terminal visits). Does not appear again in Month 1. The player is alone with the question after Week 2.
- **Encounter:** Guaranteed on Day 1 (admin errand is mandatory, Glenn is always on the bench).

### 2.2 Scott (Roommate)
- **Room:** Shares the player's dorm room (Room 214).
- **NPC ID:** `npc_roommate_scott`
- **Day-one impression:** Open, easy, already set up. Return of the Jedi poster, milk crate of tapes (Journey, Styx, Hall & Oates mix tape from his sister). Clock radio.
- **Personality:** Makes friends by being useful. Says yes to everything.
- **Friction seed:** People-pleaser who can't say no. Will double-book himself. Eventually this becomes its own kind of dishonesty.

### 2.3 Doug (Hallmate #1)
- **Room:** Two doors down.
- **NPC ID:** `npc_floor_doug`
- **Day-one impression:** Loud, confident. Brother went here (Class of '80). Knocks on your door within the first hour. Decides the group is getting lunch before anyone weighs in.
- **Personality:** Takes charge. Makes things happen. Fills silence with plans.
- **Friction seed:** Takes up space without noticing. What reads as leadership on day one stops asking permission by week three.

### 2.4 Mike (Hallmate #2)
- **Room:** Down the hall.
- **NPC ID:** `npc_floor_mike`
- **Day-one impression:** Academically focused. Textbook under his arm on day one. Precise when he talks.
- **Personality:** Studies first, socializes when the work is done. Not antisocial — just has clear priorities.
- **Friction seed:** Can become rigid about grades. May develop intellectual superiority he doesn't notice.

### 2.5 Keith (Hallmate #3)
- **Room:** End of the hall.
- **NPC ID:** `npc_floor_keith`
- **Day-one impression:** Small-town kid, farm family. Calloused hands. Gives his full name. Not up on popular culture but not intimidated.
- **Personality:** Genuine. Listens more than he talks. Shakes your hand and means it.
- **Friction seed:** Decency hardens into stubbornness. Values clash with Doug.

### 2.6 Secondary NPCs (Day 1 Evening)

**Bryce** (`npc_anderson_bryce`) — Party host at Anderson Hall. Doug's connection via brother. Socially aggressive in a friendly way.

**Peterson** (`npc_floor_peterson`) — Card game organizer. Tall, glasses, quiet voice, sharp observer.

---

## 3. Environment & Period Texture

### 3.1 Dorm
- Men's dormitory. Communal bathroom. Cinderblock walls.
- Room details: Two twin beds, two desks, two closets. One window. Mattress with plastic cover that crinkles.
- RA: Todd (name on bulletin board, not a significant NPC).

### 3.2 The Quad
- Red brick paths, oaks, September light, long shadows.
- Chapel nearby (Glenn's bench). Admin building across the quad.
- Students in polo shirts and high-waisted jeans.

### 3.3 Dining Hall
- Institutional trays. Long tables (no booths). Steam trays. Salad bar. Brownies cut in precise squares.
- Waffle iron referenced. Meal plan is a real cost.

### 3.4 1983 Object Vocabulary
Clock radio, paper schedules, paperback books, corduroy jackets, cassette tapes, rotary/push-button hallway phones, typewriters, physical bulletin boards, Walkman, vinyl records.

---

## 4. Plot Architecture — Day 1

| # | Slug | Setting | Primary Stream |
|---|------|---------|---------------|
| 1 | `s_d1_the_quad` | Campus quad, morning | Belonging |
| 2 | `s_d1_dorm_roommate` | Dorm room | Roommate |
| 3 | `s_d1_dorm_hallmates` | Dorm hallway | Belonging |
| 4 | `s_d1_admin_errand` | Administration building | Academic |
| 5 | `s_d1_bench_glenn` | Quad bench, near chapel | ??? (frame) |
| 6 | `s_d1_lunch_floor` | Dining hall | Belonging |
| 7 | `s_d1_evening_choice` | Various | Belonging |

### Key Collision: The Time Squeeze
Admin is mandatory. The choice is WHEN, not WHETHER. Three timing paths create three different emotional registers for every subsequent encounter.

### 4.1 Arc One, Week 2 (drafted, awaiting playtest feedback)

Week 2 architecture lives in its own brief: `arc1-week2-brief.md`. Collision map lives in `collision-calendar-week2.md`.

Week 2 introduces five landmarks:

- **L1 — The Job Board** (Mon Day 7 PM, `s_w2_the_job_board`): terminal choice between four work-study options (library shelving, dining hall breakfast, grounds crew, or R. Chen econ research assistant). Locks the player's weekly time drain for the rest of the arc.
- **L2 — Scott's Thing** (Wed Day 9 PM, `s_w2_scotts_thing`): FSM-gated three-variant scene. Scott receives a letter — his father has had a heart attack. Variant (`genuine_connection` / `surface_tension` / `avoidance`) depends on Week 1-2 roommate-track state.
- **L3 — The First Shift** (Thu Day 10, `s_w2_first_shift_{variant}`): first time the work-study commitment bites. Four short variants, one per job choice from L1. The Chen variant (R. Chen, Crandall Hall 304, flagging passages in *Journal of Monetary Economics* reprints) is the one that carries investigation weight.
- **L4 — The Tuesday Commitment** (Sun Day 13 PM, `s_w2_tuesday_commitment`): reflection landmark where the player mentally lays out Tuesday evening and realizes it is overbooked four ways — Priya's Western Civ study group, the ARPANET terminal, the library shelving shift (if taken), and Scott's half-asked movie invitation. Four pulls, one slot. Terminal choice.
- **L5 — The Post** (Tue Day 15 PM, `s_w2_the_post`, gated by choosing the terminal on L4): the week's investigation landmark. The player reads a seeded Usenet thread by a user named `jstern` asking specific, researchable questions about Soviet grain dependency and Western Siberian oil sustainability. The questions are ones a 1983 person would not think to ask. Infrastructure for the shared terminal (multiplayer read/post) will be wired up later; the seed content is authored now.

Supporting beats drafted (7): The Pay Phone Line, Scott Cereal at 11pm, Heller's Lecture / Tomás's Pen, Miguel's Guitar, Priya in the Dining Hall, Doug's Story About His Coach, The Headline.

Supporting beats to commission after playtest feedback (4): Mike studying with his door cracked, Keith doing something practical, a Bryce party invite with no response required, Scott on the hallway phone with his mom.

Status: playtest-first. Ship the current draft, gather feedback, then fill in missing beats and iterate.

---

## 5. Writing Rules

- Max 4 sentences per conversational node
- Choice labels: 3-8 words. Physical verbs for action.
- Trust physical detail over emotional narration
- Characters are NOT articulate about their feelings
- No NPC names in choice labels before the player knows the name
- No "a wave of [emotion] washed over"
- No "Part of him wanted X. But another part..."
- 1983 lives in the nouns

### 5.1 Reference Games & Authors
- **Prose:** Rohinton Mistry, Raymond Carver, Denis Johnson, Lorrie Moore, Alice Munro
- **Game writing:** Disco Elysium, Kentucky Route Zero, 80 Days, Dispatch
- **Dispatch** is a key reference for how stories have points of crystallization within longer tracks — moments where accumulated choices snap into a defining scene

---

## 6. Changelog

| Date | Change |
|------|--------|
| 2026-03-30 | Created lore bible. Established Glenn, Scott, Doug, Mike, Keith. Mapped Day 1 storylet sequence. |
| 2026-03-30 | Added evening activities, Bryce and Peterson NPCs. Admin errand mandatory with flexible timing. All 7 storylets drafted. |
| 2026-04-09 | Added Time-Travel Frame section (alternate timeline, 60-year progression). Updated Glenn with Pastime Paradise note, "explained as time goes on" line. Added Dispatch as reference game for crystallization points. |
| 2026-04-09 | Added section 1.5 The Investigation — frames investigation as shared space (proto-Usenet), specific and researchable content (not vibes), trace-based contact model, groups-exist-but-no-stance-tracker. Updated Glenn 2.1 to specify he won't answer direct questions about the frame. Added section 4.1 Arc One Week 2 architecture stub with L1-L5 summary, pointing at `arc1-week2-brief.md` and `collision-calendar-week2.md`. |
