<!-- /docs/PERIOD-FRICTION-CONTENT-BRIEF.md -->
<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/ folder in MMV repo       -->
<!-- ///////////////////////////////////////////// -->

# Period Friction Content Brief — T-1776329282001

> **Status:** Code-ready content brief. Format matches `docs/WEEK-2-CONTENT-BRIEF.md`.
> **Ticket:** T-1776329282001 (col_todo, sprint d4e5f) — "6 social beats + Jordan + physical beats"
> **Infrastructure:** Period-stance + conditional `events_emitted` + DialogueNode predicates merged to `main` 2026-05-01 (`3f0b420`). All schema this brief uses is live.
> **Precedent:** Beat 2A "The Hallway Comment" — shipped 2026-04-25 in `hallway_morning_day3` via migration `20260425110000_hallway_morning_day3_friction_beat.sql`. Use that file as the structural template for everything below. Integration test `hallway_friction_challenged.yaml` is the regression gate pattern.
> **Source map:** `docs/PERIOD-FRICTION-CONTENT-MAP.md` (the design spec this brief implements).

---

## What This Brief Builds

Five remaining friction beats (2B–2F), one Jordan-presence texture beat (2G, new), and two ambient physical-period nodes — all wired into existing or new host storylets. Beat 2A is shipped and is not in this brief.

| Beat | Category | Host (status) | Track | Day | Segment | New storylet? |
|------|----------|--------------|-------|-----|---------|---------------|
| ~~2A: Hallway Comment~~ | Homophobia | `hallway_morning_day3` (SHIPPED) | belonging | 3 | morning | — |
| 2B: Peterson's Joke | Homophobia | New: `lounge_cards_night` | belonging | 9 | evening | **YES** |
| 2C: Quad Walk | Misogyny | New: `walk_to_class_day4` | belonging | 4 | morning | **YES** |
| 2D: Study Group Assumption | Misogyny | `study_group_forming` (RETROFIT) | academic | 3 | afternoon | retrofit |
| 2E: Priya's Introduction | Racism | `priya_dining_hall` (RETROFIT) | belonging | 4–6 | afternoon | retrofit |
| 2F: TV Conversation | Racism | New: `floor_lounge_tv_day7` | belonging | 7 | evening | **YES** |
| 2G: Jordan in the Hallway | Texture | New: `floor_hallway_day6` | belonging | 6 | evening | **YES** |
| Phys-A: Smoke in the Lounge | Physical period | Folded into 2B | (n/a) | 9 | evening | (no own slot) |
| Phys-B: Pay Phone | Physical period | Folded into existing `pay_phone_line` | home | 7 | evening | retrofit |

**Total new storylets:** 4 (lounge_cards_night, walk_to_class_day4, floor_lounge_tv_day7, floor_hallway_day6).
**Retrofits:** 3 (study_group_forming, priya_dining_hall, pay_phone_line).
**All new storylets are pool mode (`default_next_key=NULL`).** All friction beats are micro-choices inside conversational nodes (Rule 11 compliance).

---

## Jordan: Design Decision Locked This Brief

Per session decision 2026-05-03 (Open Question #5 of the source map):

**Jordan is closeted queer in 1983.** This is established quietly and never named in Arc One. The player can discover it through pattern, not exposition. Jordan becomes the silent gravitational center of every homophobia beat — present, hearing it, saying nothing, leaving slightly differently each time.

**What this brief does with Jordan:**
- Beat 2B: Jordan is in the lounge during Peterson's joke. Doesn't react. Leaves shortly after. (Conditional node text variant if `period_stance: challenged ≥ 1` from Beat 2A — the player notices Jordan glancing at them when they pushed back. Otherwise the player doesn't register Jordan at all.)
- Beat 2G (new): A 30-second hallway encounter where the player simply sees Jordan in passing. No homophobia content. Just two physical details that compound for the player who's been paying attention: Jordan's door is the only one without a name on it, and Jordan never has anyone in the room with him. The player can't act on this. It's texture.
- **Out of scope this brief:** Jordan's coming-out-or-not crystallizer. That's a Week 3+ scene with its own ticket. This brief seeds the recognition that he exists.

**What Jordan does NOT do in Arc One:**
- Doesn't come out
- Doesn't befriend the player
- Doesn't have a confiding scene
- Doesn't make eye contact except in one specific gated moment in Beat 2B

The payoff is delayed. The player who challenges in Beats 2A/2B and notices in 2G has built the conditions for Jordan to eventually trust them — but not yet. The brief explicitly under-delivers Jordan because the long-arc weight depends on the player having earned access by Week 3+.

---

## Beat 2B: "Peterson's Joke" — `lounge_cards_night`

**Stream:** belonging (primary) | roommate (secondary collision pressure if Scott is in the room next door)
**Day/Segment:** Day 9 evening
**Time cost:** 2h
**Mode:** Pool (`default_next_key=NULL`)
**Tags:** `friction:homophobia`, `npc:peterson`, `npc:doug`, `npc:keith`, `npc:jordan_present`
**Requirements:** None (open belonging slot). No `requires_choice`.

### Body Preamble (1 sentence)
Cards in the lounge. Peterson dealing. Doug and Keith already at the table; an empty chair across from Peterson with your name on it.

### Nodes

```yaml
nodes:
  - key: settle_in
    speaker: peterson
    text: |
      "About time. Five-card draw, nickel ante. Don't pretend you don't
      know how to play."
    text_variants:
      - condition: { all_flags: [hallway_challenged] }
        text: |
          "About time." Peterson nods at the empty chair without
          looking up. Keith's already shuffling.
    next: peterson_setup_joke
    auto_advance: true

  - key: peterson_setup_joke
    speaker: peterson
    text: |
      He's in the middle of a story when you sit down. Something about
      his cousin's wedding. Doug is grinning like he knows the punchline.
      You catch Jordan in the corner — the small couch by the window,
      a textbook open. Not playing.
    next: peterson_lands_joke
    auto_advance: true

  - key: peterson_lands_joke
    speaker: peterson
    text: |
      "—and so the priest goes, 'son, that's not what we mean by holy
      matrimony.'" Peterson lands the punchline. The joke's whole shape
      depends on the groom being read as gay. Doug barks a laugh. Keith
      snorts. Peterson looks pleased with himself and starts dealing.
    micro:
      - id: peterson_absorbed
        label: Laugh. Pick up your cards.
        sets_flag: peterson_absorbed
        period_stance: absorbed
      - id: peterson_deflected
        label: Half-smile. Look at your cards instead.
        sets_flag: peterson_deflected
        period_stance: deflected
      - id: peterson_challenged
        label: "\"That joke's old, Peterson.\""
        sets_flag: peterson_challenged
        period_stance: challenged
        label_variants:
          - condition: { period_stance: { tag: challenged, min: 1 } }
            label: "\"Come on, Peterson.\""
    next: jordan_glance
    auto_advance: true

  - key: jordan_glance
    text: |
      The hand gets dealt. Peterson moves on. The joke is already gone
      from the room.
    text_variants:
      - condition: { flag: peterson_challenged }
        text: |
          The hand gets dealt. Peterson moves on, ribs Doug about
          something. But Jordan looked up when you said it. Not at
          Peterson. At you. Then back to his book.
      - condition: { flag: peterson_absorbed, period_stance: { tag: absorbed, min: 2 } }
        text: |
          The hand gets dealt. The joke moves through you without
          catching on anything. That's the part you notice — that
          there's nothing left to catch on.
    next: choices
    auto_advance: true
```

### Terminal Choices

```yaml
choices:
  - id: stay_play
    label: Stay. Play the hand out.
    time_cost: 2
    energy_cost: 1
    relational_effects:
      - npc_id: npc_floor_peterson
        affinity: 1
      - npc_id: npc_floor_doug
        reliability: 0.5
    events_emitted:
      - condition: { flag: peterson_absorbed }
        events:
          - type: NPC_TRUST
            npc_id: npc_floor_keith
            magnitude: 0.5
          - type: NPC_TRUST
            npc_id: npc_floor_doug
            magnitude: 0.5
      - condition: { flag: peterson_deflected }
        events:
          - type: NPC_AWKWARD
            npc_id: npc_floor_peterson
            magnitude: 0.3
      - condition: { flag: peterson_challenged }
        events:
          - type: NPC_TRUST
            npc_id: npc_floor_keith
            magnitude: -0.5
          - type: NPC_TRUST
            npc_id: npc_floor_peterson
            magnitude: -1.0
          - type: NPC_NOTICED
            npc_id: npc_ambiguous_jordan
            magnitude: 1.0
            memory_key: jordan.witnessed_pushback
    sets_flag:
      - peterson_lounge_played

  - id: leave_early
    label: One hand. Then bed.
    time_cost: 1
    energy_cost: 0
    relational_effects:
      - npc_id: npc_floor_peterson
        affinity: -0.5
    events_emitted:
      - condition: { flag: peterson_challenged }
        events:
          - type: NPC_NOTICED
            npc_id: npc_ambiguous_jordan
            magnitude: 1.0
            memory_key: jordan.witnessed_pushback
    sets_flag:
      - peterson_lounge_brief
```

### Phys-A: Smoke (folded in)
Beat 2B carries the smoking texture. Add to `peterson_setup_joke` body the line: *"Peterson's cigarette is balanced on the rim of an empty Coke can. The room smells like ashtray and floor wax."* No micro-choice. The smell is environmental — the player can't avoid it because they're sitting in it. That's the period beat: 1983 indoor air.

### Collision (six questions)
1. **Primary stream:** belonging
2. **Collides with:** roommate (Scott may be reading next door, expecting the player back); academic (Day 10 has a class — staying late costs morning energy)
3. **Player misses:** Tuesday-night opportunity beats (`tuesday_night_terminal`, `tuesday_night_dana_movie`, `tuesday_night_shift`) all live Day 9 evening. Picking lounge_cards_night precludes them for tonight.
4. **NPC memory:** Reads existing Peterson/Doug/Keith state (no preconditions). Writes `jordan.witnessed_pushback` on challenged path — first persistent Jordan memory in the game.
5. **Door closed:** `stay_play` precludes the three Tuesday-night variants for Day 9. `leave_early` is a softer preclusion (1h instead of 2h) but still locks out the evening alternates due to time.
6. **Miss path:** If player skips this storylet (chooses Tuesday-night content instead), they never see Peterson's joke and never write `peterson_*` flags. The accumulation pattern still works — Beat 2A alone is a valid one-beat pattern.

---

## Beat 2C: "The Quad Walk" — `walk_to_class_day4`

**Stream:** belonging (primary)
**Day/Segment:** Day 4 morning
**Time cost:** 1h
**Mode:** Pool (`default_next_key=NULL`)
**Tags:** `friction:misogyny`, `npc:doug`, `npc:keith`, `physical:quad`
**Requirements:** None.

### Body Preamble (2 sentences)
Doug catches you in the hall. He and Keith are walking to Western Civ; same building as your morning class. You fall in.

### Nodes

```yaml
nodes:
  - key: leave_dorm
    text: |
      Outside is brighter than you expected. The grass on the quad is
      still wet — sprinklers ran early. A handful of students cutting
      across, paper schedules tucked under arms. Keith is talking about
      his weekend.
    next: women_pass
    auto_advance: true

  - key: women_pass
    speaker: doug
    text: |
      A group of three women — sophomores, probably — cuts across the
      quad heading the other direction. Doug nudges you with his elbow.
      "Check it out." He says something about the one in the middle.
      Not crude exactly. Evaluative. Like she's a thing to assess.
      Keith picks one and gives her a number.
    next: she_glances
    auto_advance: true

  - key: she_glances
    text: |
      The middle one glances back. She heard. Her expression doesn't
      change. She keeps walking.
    micro:
      - id: quad_absorbed
        label: Look where they're looking. Shrug.
        sets_flag: quad_absorbed
        period_stance: absorbed
      - id: quad_deflected
        label: Don't engage. Keep walking.
        sets_flag: quad_deflected
        period_stance: deflected
      - id: quad_challenged
        label: "\"Come on, man.\""
        sets_flag: quad_challenged
        period_stance: challenged
    next: walk_continues
    auto_advance: true

  - key: walk_continues
    text: |
      The conversation moves on. Keith starts in on the football team's
      weekend. The building is up ahead.
    text_variants:
      - condition: { flag: quad_challenged }
        text: |
          Doug glances at you. Doesn't say anything. Keith does — short
          and confused. "What's your problem?" Then he answers his own
          question by changing the subject. The building is up ahead.
      - condition: { flag: quad_deflected }
        text: |
          Doug and Keith keep going for another minute. You're a half-
          step behind them by the time you reach the building.
    next: choices
    auto_advance: true
```

### Terminal Choices

```yaml
choices:
  - id: walk_in_with_them
    label: Walk into the building together.
    time_cost: 1
    energy_cost: 0
    relational_effects:
      - npc_id: npc_floor_doug
        reliability: 0.5
    events_emitted:
      - condition: { flag: quad_absorbed }
        events:
          - type: NPC_TRUST
            npc_id: npc_floor_keith
            magnitude: 0.5
          - type: NPC_RELIABILITY
            npc_id: npc_floor_doug
            magnitude: 0.5
          - type: NPC_PRECLUDES
            npc_id: npc_studious_priya
            memory_key: priya.gate_misogyny_witnessed
      - condition: { flag: quad_deflected }
        events: []
      - condition: { flag: quad_challenged }
        events:
          - type: NPC_RELIABILITY
            npc_id: npc_floor_doug
            magnitude: -0.5
          - type: NPC_TRUST
            npc_id: npc_floor_keith
            magnitude: -1.0
    sets_flag:
      - walked_with_floor_day4

  - id: peel_off
    label: Peel off at the entrance. You forgot something.
    time_cost: 1
    energy_cost: 0
    relational_effects:
      - npc_id: npc_floor_doug
        affinity: -0.5
    sets_flag:
      - alone_after_quad
```

### Collision
1. **Primary stream:** belonging
2. **Collides with:** academic (this is the morning approach to a Day 4 academic slot — peeling off changes how that slot opens)
3. **Player misses:** A solo morning walk that would have served `morning_alone_day4` (a future quiet morning storylet — for now, the alternative is just an empty pool slot)
4. **NPC memory:** No preconditions. Writes `priya.gate_misogyny_witnessed` on absorbed path — Priya's Beat 2E gate becomes harder to unlock (she has a separate witness check via her own arc memory, but this records the player's pattern for later cross-reference)
5. **Door closed:** Absorbed path closes a Priya gate condition. Challenged path costs Keith trust −1 — significant.
6. **Miss path:** Player wakes up and goes to class alone. No friction beat. Doug doesn't notice the missed connection (he doesn't know you almost walked with him). This is a clean miss — no penalty for not being there, but no compounding social capital with the floor majority either.

---

## Beat 2D: "The Study Group Assumption" — RETROFIT to `study_group_forming`

**Existing storylet:** `study_group_forming` (academic, Day 3 afternoon, intro `npc_studious_priya`)
**What changes:** Add 2 nodes mid-conversation — the assumption beat, then a closing texture node. Existing terminal choices remain; only their `events_emitted` get conditional groups added.

### New nodes to insert

Insert between the existing `meet_priya` node (or whatever the current intro node is — Code: read live DB) and the existing terminal choice prompt:

```yaml
  - key: paper_assignment
    speaker: bryce  # or whichever male student is in the group
    text: |
      "Cool, so we're set on Tuesday and Thursday. Who's got paper?"
      He looks at Priya. Doesn't ask. Just looks. "You're good at
      that, right?"
    next: priya_takes_paper
    auto_advance: true

  - key: priya_takes_paper
    text: |
      Priya pulls a notebook out of her bag. Doesn't say anything.
      Doesn't react. Just opens to a fresh page.
    micro:
      - id: study_absorbed
        label: Don't say anything. She's handling it.
        sets_flag: study_absorbed
        period_stance: absorbed
      - id: study_deflected
        label: "\"I can take notes — I write fast.\""
        sets_flag: study_deflected
        period_stance: deflected
      - id: study_challenged
        label: "\"Why don't we rotate?\""
        sets_flag: study_challenged
        period_stance: challenged
    next: study_resolves
    auto_advance: true

  - key: study_resolves
    text: |
      The group settles on the schedule. Tuesdays and Thursdays after
      Western Civ. Priya closes her notebook.
    text_variants:
      - condition: { flag: study_deflected }
        text: |
          Priya looks at you for half a second. Closes her notebook.
          Doesn't push back on the offer. The group settles on the
          schedule. Tuesdays and Thursdays.
      - condition: { flag: study_challenged }
        text: |
          The guy who asked her — looks confused for a second, then
          shrugs. "Yeah, sure, rotate." Priya doesn't react. Closes
          her notebook. The group settles on the schedule.
    next: choices
    auto_advance: true
```

### Terminal choices: add conditional events_emitted to existing

```yaml
# On the EXISTING "join_study_group" terminal (or equivalent), add:
    events_emitted:
      - condition: { flag: study_deflected }
        events:
          - type: NPC_TRUST
            npc_id: npc_studious_priya
            magnitude: 0.5
            memory_key: priya.deflected_for_her
      - condition: { flag: study_challenged }
        events:
          - type: NPC_TRUST
            npc_id: npc_studious_priya
            magnitude: 1.0
            memory_key: priya.challenged_for_her
      # Absorbed path: no positive deposit, no penalty
```

### Code notes for retrofit
- Migration must UPDATE `study_group_forming.nodes` (rewrite the entire JSONB column — Chokidar/preview-branch parity).
- Migration must UPDATE the affected terminal choice's `events_emitted` to the conditional shape. Verify pre-existing flat events are preserved as the `else` group (no `condition` key).
- L4 playthrough script (`week2_l4_tuesday_commitment.yaml`) does not exercise this storylet. Add a new playthrough `study_group_assumption_challenged.yaml` as the integration regression — analogous to `hallway_friction_challenged.yaml`.

### Collision
1. **Primary stream:** academic
2. **Collides with:** belonging (Day 3 afternoon also has `miguel_afternoon_day3`)
3. **Player misses:** Meeting Priya in this context. Player can still meet Priya later via `priya_dining_hall` — but that scene gates differently.
4. **NPC memory:** Writes `priya.deflected_for_her` or `priya.challenged_for_her` on retrofit paths. These become inputs to Priya's Week 3 invitation gate.
5. **Door closed:** Absorbed path doesn't close anything per se but doesn't deposit toward Priya's gate.
6. **Miss path:** Player skips study group → meets Priya only via `priya_dining_hall` (Beat 2E) without prior context. Both paths can deposit to Priya independently.

---

## Beat 2E: "Priya's Introduction" — RETROFIT to `priya_dining_hall`

**Existing storylet:** `priya_dining_hall` (belonging, Day 4–6 afternoon, intro `npc_studious_priya`)
**What changes:** Insert 2 nodes mid-conversation. Add Bryce or a new floormate name (`npc_floor_anonymous_questioner` — cheaper to use an existing NPC; suggest Bryce) as the questioner. The existing storylet pivot remains the player getting to know Priya; this beat adds the friction texture in between.

### New nodes to insert

Insert these after the existing dining-hall intro / Priya-arrives node, before any existing terminal choice prompt:

```yaml
  - key: where_youre_from
    speaker: bryce
    text: |
      Bryce drops into the seat across from Priya, tray clattering.
      "I haven't met you yet. I'm Bryce. So where are you from?"
    next: priya_says_jersey
    auto_advance: true

  - key: priya_says_jersey
    speaker: priya
    text: |
      "New Jersey." She pours dressing on her salad. Doesn't look up.
    next: bryce_pushes
    auto_advance: true

  - key: bryce_pushes
    speaker: bryce
    text: |
      "No but like — where are your *parents* from?" Bryce gestures
      vaguely at her face. Smiling. Genuinely curious.
    next: priya_responds
    auto_advance: true

  - key: priya_responds
    speaker: priya
    text: |
      "New Jersey." Her tone is patient in a way that makes you realize
      she's done this before. Many times. Bryce starts to laugh, like
      she's making a joke.
    micro:
      - id: priya_absorbed
        label: Stay out of it. She's handling it.
        sets_flag: priya_absorbed
        period_stance: absorbed
      - id: priya_deflected
        label: "\"Hey Bryce, did you find your bio textbook yet?\""
        sets_flag: priya_deflected
        period_stance: deflected
      - id: priya_challenged
        label: "\"She said New Jersey.\""
        sets_flag: priya_challenged
        period_stance: challenged
    next: priya_aftermath
    auto_advance: true

  - key: priya_aftermath
    text: |
      Bryce doesn't quite get it. He says something about how he just
      meant it as a friendly question. The conversation drifts. Priya
      eats her salad.
    text_variants:
      - condition: { flag: priya_deflected }
        text: |
          Bryce takes the textbook bait. He hasn't found it. Five-
          minute story about the bookstore line. Priya catches your
          eye for a second. Goes back to her salad.
      - condition: { flag: priya_challenged }
        text: |
          Bryce flushes. "I — yeah, of course. Sorry." He recovers
          quick, makes a joke about the cafeteria food. Priya looks
          at you with something complicated. Says nothing.
    next: choices
    auto_advance: true
```

### Terminal choices: add conditional events_emitted

```yaml
# On the EXISTING terminal that resolves the Priya scene (likely "stay_with_priya" or similar):
    events_emitted:
      - condition: { flag: priya_deflected }
        events:
          - type: NPC_TRUST
            npc_id: npc_studious_priya
            magnitude: 0.5
            memory_key: priya.dining_deflected
          - type: NPC_RELIABILITY
            npc_id: npc_anderson_bryce
            magnitude: -0.3
      - condition: { flag: priya_challenged }
        events:
          - type: NPC_TRUST
            npc_id: npc_studious_priya
            magnitude: 1.0
            memory_key: priya.dining_challenged
          - type: NPC_RELIABILITY
            npc_id: npc_anderson_bryce
            magnitude: -0.5
      # Absorbed: no event added (silently absorbed)
```

### Code notes
- Same retrofit pattern as 2D. Rewrite full `nodes` JSONB. Add conditional `events_emitted` while preserving the flat events as the unconditional tail.
- Bryce needs to be available as a speaker — verify `npc_anderson_bryce` is introduced before Day 4 (yes: `evening_choice` introduces him). Pre-Day 4 player won't see this scene unless they went to the party — flag as a potential pool-gating gap. **Mitigation:** if `evening_choice.go_to_cards` was chosen (Bryce never met), substitute speaker with `npc_floor_doug` and adjust `bryce_pushes` text to "Doug": same beat, different mouth. Implement via node `text_variants` checking `requires_choice: go_to_party_evening`. Code: confirm choice key in DB before drafting the variant text.
- New regression playthrough: `priya_dining_challenged.yaml`.

### Collision
1. **Primary stream:** belonging
2. **Collides with:** academic (Day 4–6 afternoons also serve `study_group_forming` if not yet resolved)
3. **Player misses:** Meeting Bryce in this context (he becomes a known dining-hall presence vs. just the party host). Also a path to a more positive Priya impression if absorbed pattern holds elsewhere.
4. **NPC memory:** `priya.dining_*` joins `priya.deflected_for_her`/`priya.challenged_for_her` from 2D as Priya's Week 3 gate inputs.
5. **Door closed:** Absorbed path silently records pattern, no positive deposits with Priya. The compounding cost shows up at the Week 3 gate.
6. **Miss path:** Player never meets Priya through dining hall → relationship stays cool through Arc One → Week 3 invitation never fires.

---

## Beat 2F: "The TV Conversation" — `floor_lounge_tv_day7`

**Stream:** belonging (primary)
**Day/Segment:** Day 7 evening
**Time cost:** 2h
**Mode:** Pool (`default_next_key=NULL`)
**Tags:** `friction:racism`, `npc:doug`, `npc:keith`, `physical:tv`
**Requirements:** None.

### Body Preamble (2 sentences)
The TV in the floor lounge is on — news, then a sitcom, then back to news. Half the floor is in here pretending to study, including Doug and Keith on the corduroy couch.

### Nodes

```yaml
nodes:
  - key: news_segment
    text: |
      The anchor is talking about the marines in Beirut. Footage of
      a barracks; a number on the screen. Doug and Keith aren't really
      watching. Keith has a textbook open on his knee but hasn't
      turned a page in five minutes.
    next: keith_opines
    auto_advance: true

  - key: keith_opines
    speaker: keith
    text: |
      "I don't get why we're even over there." He says it like he's
      commenting on the weather. "Those people have been killing each
      other for two thousand years. Always going to. It's just how
      they are."
    next: room_response
    auto_advance: true

  - key: room_response
    text: |
      Doug nods. So does the guy in the armchair you don't know. Nobody
      is pushing back. Nobody is engaging either. It's not a debate.
      It's wallpaper.
    micro:
      - id: tv_absorbed
        label: Stare at the screen. Don't say anything.
        sets_flag: tv_absorbed
        period_stance: absorbed
      - id: tv_deflected
        label: "\"Anyone seen what's on Channel 7?\""
        sets_flag: tv_deflected
        period_stance: deflected
      - id: tv_challenged
        label: "\"That's not really how it works.\""
        sets_flag: tv_challenged
        period_stance: challenged
    next: news_continues
    auto_advance: true

  - key: news_continues
    text: |
      The news goes to commercial. Someone gets up to change the
      channel.
    text_variants:
      - condition: { flag: tv_challenged }
        text: |
          Keith looks at you. Doesn't say anything. Doug shifts on
          the couch. The room reorganizes around the small thing
          you said. It doesn't feel like winning.
      - condition: { flag: tv_deflected }
        text: |
          Someone takes the bait — turns out Magnum P.I. is on. The
          channel flips. The conversation moves.
    next: choices
    auto_advance: true
```

### Terminal Choices

```yaml
choices:
  - id: stay_lounge
    label: Stay in the lounge. Watch whatever's on.
    time_cost: 2
    energy_cost: 0
    relational_effects:
      - npc_id: npc_floor_doug
        reliability: 0.3
    events_emitted:
      - condition: { flag: tv_absorbed }
        events:
          - type: NPC_RELIABILITY
            npc_id: npc_floor_doug
            magnitude: 0.5
          - type: NPC_TRUST
            npc_id: npc_floor_keith
            magnitude: 0.3
      - condition: { flag: tv_challenged }
        events:
          - type: NPC_RELIABILITY
            npc_id: npc_floor_doug
            magnitude: -0.5
          - type: NPC_TRUST
            npc_id: npc_floor_keith
            magnitude: -1.0
          - type: NPC_TRUST
            npc_id: npc_floor_mike
            magnitude: 1.0
            memory_key: mike.witnessed_tv_pushback

  - id: leave_for_room
    label: Head back to your room.
    time_cost: 1
    energy_cost: 0
    sets_flag:
      - left_lounge_early_day7
```

### Collision
1. **Primary stream:** belonging
2. **Collides with:** roommate (Day 7 evening also serves Scott availability), academic (catch-up reading), home (`pay_phone_line` is Day 7 evening — see Phys-B retrofit below)
3. **Player misses:** Calling home (pay_phone_line). Picking lounge means no call home tonight.
4. **NPC memory:** Writes `mike.witnessed_tv_pushback` on challenged path — third Mike-witness deposit, which (per content map §3.3) is the gate for Mike's private conversation in Week 3.
5. **Door closed:** Stay path locks out pay_phone_line tonight. Leave path keeps it open.
6. **Miss path:** Player calls home or sleeps early → never sees the Beirut moment → no `tv_*` flag written. The pattern continues without this beat. The challenger pattern can still hit threshold via 2A + 2B + 2C alone.

---

## Beat 2G: "Jordan in the Hallway" — `floor_hallway_day6`

**Stream:** belonging (primary)
**Day/Segment:** Day 6 evening
**Time cost:** 0h (texture beat — fires opportunistically before another scene; see implementation note)
**Mode:** Pool (`default_next_key=NULL`)
**Tags:** `texture`, `npc:jordan`, `physical:hallway`
**Requirements:** None initially. **Recommended:** gate to `period_stance: { tag: challenged, min: 1 } OR { tag: deflected, min: 1 }` so it only fires for players who've shown some friction sensitivity. (Open question — see "Code questions" below.)

### Body Preamble
You're heading down the hallway to the bathroom. The lights are the bad fluorescent kind, half the doors are open with music coming out, and someone is heating something in the microwave at the far end.

### Nodes

```yaml
nodes:
  - key: hallway_walk
    text: |
      You pass 217 — Doug and Keith's room — door propped open, Springsteen
      on the stereo, four guys inside. You pass 219 — empty, light off.
      You pass 221.
    next: pass_jordan_room
    auto_advance: true

  - key: pass_jordan_room
    text: |
      221 is Jordan's room. Door open six inches. Nobody else inside.
      Jordan is at his desk, headphones on, a textbook spread under
      a goose-neck lamp. Looks up as you pass. Nods. Goes back to
      the page.
    next: hallway_observation
    auto_advance: true

  - key: hallway_observation
    text: |
      You keep walking. It hits you halfway down the hall: Jordan's
      door is the only one without a name on it. Every other door
      has a card or a strip of masking tape. You don't know if you've
      ever seen anyone in his room.
    next: choices
    auto_advance: true
    text_variants:
      - condition: { period_stance: { tag: challenged, min: 2 } }
        text: |
          You keep walking. Jordan's door is the only one without
          a name on it. You file it away with the other things you've
          been filing away — the silence in the lounge when Peterson
          told that joke; the way Jordan was already up and gone the
          next morning. Pieces of something you don't have a frame
          for yet.
```

### Terminal Choices

```yaml
choices:
  - id: keep_walking
    label: Keep going. The bathroom is at the end of the hall.
    time_cost: 0
    energy_cost: 0
    sets_flag:
      - noticed_jordan_room
      - jordan_thread_seeded

  - id: turn_back
    label: Turn around. Go back to your room.
    time_cost: 0
    energy_cost: 0
    sets_flag:
      - noticed_jordan_room
      - jordan_thread_seeded
```

**Note on terminal choices:** Both options write the same flags. The choice is purely texture — the player decides whether the moment makes them want to be near people or alone. No mechanical consequence. This is the equivalent of a déjà vu beat: the *noticing* is the content, not the action.

### Collision
1. **Primary stream:** belonging (texture)
2. **Collides with:** Nothing meaningfully — 0h cost, fires as a transition between other Day 6 evening content
3. **Player misses:** Nothing. This is texture — if they don't see it, they don't feel the absence
4. **NPC memory:** Sets `jordan_thread_seeded` arc flag. This is the prereq for the Week 3+ Jordan crystallizer (out of scope this brief).
5. **Door closed:** None.
6. **Miss path:** Player never notices Jordan exists. Week 3+ Jordan content does not unlock. Acceptable miss — Jordan is opt-in via attention, not forced.

### Code questions for this beat (raise before building)
- **Time cost = 0 — is the pool scan happy with that?** Beat 2A precedent uses a costed host (the storylet `hallway_morning_day3` itself has time cost). 2G is a different shape: it wants to be a free interstitial. **Recommendation:** make it a real pool storylet with `time_cost: 0` on both terminals and `default_next_key=NULL`. If the engine assumes positive time cost per slot, change to `time_cost: 1` and accept that "noticing Jordan" eats an hour.
- **Should it gate on prior period_stance pattern?** The text_variant at `hallway_observation` shows two registers: a baseline observation, and a richer one for `challenged ≥ 2`. Either: (a) ungate the storylet so everyone can see the basic version (current spec), or (b) gate the whole storylet on `period_stance ≥ 1` so only players who've shown some friction awareness encounter it. **Recommendation:** ungated baseline — the text variant handles register shift. Otherwise consistent absorbers never get the Jordan thread, which forecloses too early.

---

## Phys-B: Pay Phone Texture — RETROFIT to `pay_phone_line`

**Existing storylet:** `pay_phone_line` (home, Day 7 evening, only home-track storylet)
**What changes:** Add 1 ambient texture node before the existing call-home content. No micro-choices. Pure period sensory.

### New node to insert (top of node list)

```yaml
  - key: phone_line
    text: |
      The hallway phone is a payphone bolted to the wall between
      the lounge and the stairs. There's a line — three guys ahead
      of you, each working through their roll of dimes. The cord
      is the long coiled kind, kinked from being yanked into rooms.
      Whoever's on it now has been arguing for ten minutes; you can
      hear "look, MOM" through the receiver from where you're standing.
    next: existing_first_node  # whatever the current first node is
    auto_advance: true
```

This is non-interactive period furniture. The player feels the friction of 1983 calling home — the line, the dimes, the public-ness of it — without making a choice about it. It frames the call that follows.

### Code notes
- This retrofit doesn't change any choices, events, or flags. Pure node insertion at top.
- Existing `pay_phone_line` regression playthrough (if any) should still pass.

---

## Cross-Beat Concerns (read before coding)

### NPC introductions
- **Jordan** is in the registry as `npc_ambiguous_jordan` but has never been introduced via `introduces_npc`. Beat 2B's terminal choice should set `introduces_npc: [npc_ambiguous_jordan]` when the player picks `peterson_challenged` (the Jordan-glance text variant fires only on this path). Alternative: introduce Jordan in Beat 2G's terminal regardless of period_stance — every player who notices Room 221 has met Jordan. **Recommendation:** introduce in Beat 2G — Jordan should be a known NPC the moment the player has registered him, regardless of friction history.
- **Bryce** is already introduced via `evening_choice`. Beat 2E uses him as speaker; verify pre-Day 4 player has had `evening_choice` resolve. If not, fall back to Doug per the substitution note.
- **Mike** is in registry, introduced in `dorm_hallmates`. Beat 2F adds the third `mike.witnessed_*` deposit toward his Week 3 gate (existing deposits: hallway from Beat 2A, lunch_floor's defender path).

### Period-stance event consistency
All micro-choices use the same shape:
```yaml
- id: <slug>_<absorbed|deflected|challenged>
  label: <text or quoted dialogue>
  sets_flag: <slug>_<absorbed|deflected|challenged>
  period_stance: <absorbed|deflected|challenged>
```
The `period_stance` tag is the load-bearing field — it triggers the counter+event double-write per `feature/period-stance-infrastructure`. The `sets_flag` is walk-local for the host storylet's terminal choice gating. Both are required.

### Conditional `events_emitted` as the load-bearing pattern
Every retrofit and every new storylet uses the `ConditionalEmissionGroup[]` shape (first-match-wins, optional unconditional tail). This is the merged-to-main schema (see HANDOFF What's Done → Period-stance infrastructure). Code: do not collapse to flat events even where there's only one condition — the consistency matters for the editor and audit tooling.

### Migration ordering
Suggested order, one migration per beat for easier rollback:
1. `20260503100000_walk_to_class_day4_storylet.sql` (Beat 2C — new pool storylet)
2. `20260503110000_lounge_cards_night_storylet.sql` (Beat 2B — new pool storylet, includes Phys-A smoke node)
3. `20260503120000_floor_hallway_day6_storylet.sql` (Beat 2G — new texture storylet, introduces Jordan)
4. `20260503130000_floor_lounge_tv_day7_storylet.sql` (Beat 2F — new pool storylet)
5. `20260503140000_study_group_forming_friction_retrofit.sql` (Beat 2D)
6. `20260503150000_priya_dining_hall_friction_retrofit.sql` (Beat 2E — verify Bryce introduction state first)
7. `20260503160000_pay_phone_line_phys_texture.sql` (Phys-B)

Each migration must be idempotent (use UPSERT or `IF NOT EXISTS` patterns) to match existing migration discipline.

### Regression playthroughs to add
One per friction beat, mirroring `hallway_friction_challenged.yaml`:
- `quad_walk_challenged.yaml`
- `peterson_joke_challenged.yaml` (also exercises Jordan glance text variant)
- `study_group_assumption_challenged.yaml`
- `priya_dining_challenged.yaml`
- `tv_conversation_challenged.yaml`
- `floor_hallway_day6_smoke.yaml` (just walks the texture beat, asserts Jordan introduced + arc flag set)

Each script should: `set_identity` (pick a default), walk to the beat, choose `challenged`, `expect_period_stance` increment, `expect_walk_flag` set, `expect_npc_memory` (where applicable). Optional second variant per beat for `absorbed` to verify the silent-pattern path.

### Open code questions (raise before building)
1. **Beat 2G time_cost = 0:** Pool engine acceptance — does `selectTrackStorylets` filter out 0-cost storylets, or treat them as free interstitials?
2. **Beat 2G text_variant on a node where the body doesn't change otherwise:** Verify this is supported syntax. Beat 2A uses `text_variants` only on nodes with substantively different text — confirm it works when the variant is purely an addition rather than a replacement.
3. **Bryce substitution in Beat 2E:** Is there a clean way to do "speaker varies by prior-choice" at the node level? Or should Code build two near-identical migrations gated on `requires_choice`?
4. **`introduces_npc` from a micro-choice path vs. terminal:** Beat 2G introduces Jordan on either terminal — clean. Beat 2B's "introduce Jordan only on challenged path" is messier — defer to Beat 2G as the canonical introduction point and let 2B just deposit `jordan.witnessed_pushback` as memory on an already-introduced NPC.

---

## Acceptance Criteria

For ticket T-1776329282001 to close as `col_done`:

- [ ] 4 new storylet migrations applied (walk_to_class_day4, lounge_cards_night, floor_hallway_day6, floor_lounge_tv_day7)
- [ ] 3 retrofit migrations applied (study_group_forming, priya_dining_hall, pay_phone_line)
- [ ] All micro-choices write `period_stance` tag + walk flag in the canonical pattern
- [ ] All terminal `events_emitted` use `ConditionalEmissionGroup[]` shape
- [ ] Jordan introduced via `floor_hallway_day6` terminal `introduces_npc`
- [ ] 6 new regression playthroughs added; each passes
- [ ] `npm run playthrough:all` parity (no new failures beyond the documented pre-existing 6)
- [ ] `npx tsc --noEmit` clean
- [ ] `vitest run` parity
- [ ] Live DB verified: 4 new active storylets, 3 retrofits with new node count
- [ ] `docs/CHAIN-MAP.md` updated with the four new pool storylets
- [ ] `docs/DECISIONS.md` entry for "Jordan = closeted queer in 1983" decision (cite this brief + 2026-05-03 session)

---

## Out of Scope (logged for later tickets)

- **Jordan crystallizer scene** (Week 3+) — needs its own ticket. Should consume the `jordan_thread_seeded` arc flag.
- **Mike's private conversation** (Week 3+, gated `challenged ≥ 2`) — separate content brief.
- **Priya's invitation** (Week 3+, gated `challenged ≥ 2 AND priya.witnessed`) — separate content brief.
- **The overheard reputation** ambient beat (Week 3+) — separate.
- **AIDS arc setup** (Arc Two ~1987) — depends on accumulated Arc One pattern; out of scope.
- **More physical texture beats** (no seatbelts, leaded gas smell, etc.) — Phys-A and Phys-B are the only physical beats this brief commits to. Open Question #4 of the source map asks whether to do more; defer to a "physical period beats" content sprint.

<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/ folder in MMV repo       -->
<!-- ///////////////////////////////////////////// -->
