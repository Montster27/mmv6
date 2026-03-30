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

### 1.2 The Memory Bleed
The player character carries impressions, echoes, and fragmentary memories from a life they haven't lived yet in this timeline. The bleed operates on a spectrum:

- **Vague end:** A feeling of confidence about a situation they've never been in. A sense that something will turn out fine.
- **Specific end:** Knowing the next four notes of a melody before they're hummed. Recognizing a song that hasn't been written yet.

**Rules for the bleed:**
- Never explained in-world during Arc One. Characters do not discuss "time travel."
- Glenn is the only NPC who acknowledges the bleed directly. He does so obliquely.
- The player cannot control when bleed happens. It arrives uninvited.
- Bleed creates *dissonance*, not confidence. Knowing something you shouldn't know is destabilizing.
- **Critical rule (from Glenn):** "The broad strokes rhyme. The details don't." Future-memories are unreliable.

### 1.3 The Guaranteed-Slip Principle
In any time slot, the player has more compelling options than they can pursue. Something always falls behind. This is not punishment. It is how life works.

---

## 2. NPCs

### 2.1 Glenn (The Contact)
- **Role:** Mysterious figure on a bench near the chapel. Appears Day 1.
- **Age appearance:** Everything says twenty-one except his eyes, which say older.
- **Clothing:** Corduroy jacket, sleeves pushed up. Sneakers that were white a long time ago.
- **Personality:** Measured. Says less than he knows. Speaks like someone giving directions in a foreign city.
- **NPC ID:** `npc_contact_glenn`
- **Key traits:**
  - Knows about the memory bleed. Acknowledges it without naming it.
  - Four directives: people/circles, money/independence, knowledge/right classes, find the others/work together.
  - Warns: don't trust specific memories. Broad strokes rhyme, details don't.
  - Leaves without looking back. Not a recurring advisor.
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

---

## 6. Changelog

| Date | Change |
|------|--------|
| 2026-03-30 | Created lore bible. Established Glenn, Scott, Doug, Mike, Keith. Mapped Day 1 storylet sequence. |
| 2026-03-30 | Added evening activities, Bryce and Peterson NPCs. Admin errand mandatory with flexible timing. All 7 storylets drafted. |
