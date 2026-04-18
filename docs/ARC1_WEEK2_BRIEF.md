<!-- ARC1_WEEK2_BRIEF.md -->
# Arc One, Week 2 — Design Brief

> Status: **drafted, held for playtest feedback before filling in remaining beats.**
> Owner: Monty. Last updated: 2026-04-09.

## Throughline

Week 2 is where the player's time starts belonging to other people. The week's
arc is that the scarcity Week 1 only foreshadowed becomes concrete: a job commits
their weekly hours, a roommate crisis demands emotional presence, and by Sunday
night four different things want the same Tuesday evening slot. The week closes
with a forced choice that locks in what Week 3 will cost.

Investigation enters the game this week — not as solitary reading, but as a
shared space where Knowers ask each other real questions about real things.

---

## Character reference

Roommate is **Scott Kowalski** (see lore bible 2.2). Parma, OH; mechanical
engineering intended; Return of the Jedi poster; milk crate of tapes (Journey,
Styx, Hall & Oates); clock radio on AM. Says yes to everything, can't set
boundaries, double-books himself without noticing. The roommate relationship
drifts into distance through Scott's inability to push back, not through hostility.

> **Note:** An earlier draft of this brief and some scratch material used "Dana"
> as the roommate's name. Scott is canonical. Any surviving "Dana" references in
> working files need find-and-replace before implementation.

---

## Week 2 landmarks

### L1 — The Job Board
**Slug:** `s_w2_the_job_board`
**When:** Mon Day 7 afternoon
**Where:** Student Union 204
**Primary stream:** Money

Corkboard with four real postings:
- **Library shelving**, Baker Library, evenings, $3.35/hr, 10 hrs/wk. Typed card,
  has been up a while.
- **Dining hall breakfast**, $3.35/hr, 15 hrs/wk, 5:30–8:30am Tues/Thurs/Sat.
  Handwritten with a cheerful exclamation point.
- **Grounds crew**, $4.10/hr, 12 hrs/wk, "weather dependent." Coffee-ring on the
  card.
- **Research assistant, Economics Department**, $4.15/hr, 6 hrs/wk. Typed clean
  on an IBM Selectric, with a pencil addendum at the bottom: *See R. Chen,
  Crandall Hall 304*.

Terminal choice. Locks the player's recurring weekly time drain for the rest of
Arc One. The Chen posting is the cleanest card on the board — that's the only
tell that it's unusual.

---

### L2 — Scott's Thing
**Slug:** `s_w2_scotts_thing`
**When:** Wed Day 9 evening
**Where:** Room 214
**Primary stream:** Roommate

FSM-gated three-variant scene. Scott gets a letter from home — return address
Parma, Ohio. His father has had a heart attack. Variant fires based on Week 1-2
roommate-track state.

- **`genuine_connection`:** Scott tells the player directly, flat, like he's
  already done the loud version in his head. Conversational storylet, ~8 nodes.
  Scott doesn't cry. Talks about the drive home, his dad's shop, not knowing if
  he should go. Asks the player what they'd do. No right answer. Scene ends with
  Scott saying *I think I'm gonna try to sleep* and turning off the desk lamp
  while the player is still talking.
- **`surface_tension`:** Scott looks up, sees it's the player, looks back at the
  letter. Player can ask what's wrong, ignore it, or minimally acknowledge. If
  pushed, Scott says *my dad's in the hospital, it's fine, they think it's fine*
  and puts the letter in his desk drawer. Scene ends with Scott leaving the room
  for a long time.
- **`avoidance`:** Scott isn't in the room. The letter is face-down on his desk.
  Envelope visible. Player can look at the envelope, leave it, or read the
  letter (small identity tag). Scott comes back at 2am; player is asleep or
  pretending. In the morning Scott is gone. A pay stub is on the player's desk
  with a note: *rent's due friday don't forget.* The note isn't angry — it's the
  note of someone who has decided the player is a logistics problem.

---

### L3 — The First Shift
**Slug:** `s_w2_first_shift_{variant}`
**When:** Thu Day 10 morning (timing varies by job)
**Where:** Varies
**Primary stream:** Money
**Gated by:** L1 choice

Four short variants (~12 sentences each).

- **Library:** Mrs. Doerr (fifties, specific system for the returns cart, explains
  it twice). Third floor smells like old carpet. Radiators click. Player shelves
  for two hours and realizes they've read four hundred spines without taking any
  of them in.
- **Dining hall:** 5:30am start, industrial dishwasher already running. Terry
  (40s, not a student) showing the player the egg station. At 7:15 Doug comes
  through the line, sees the player in the hairnet, doesn't make a joke. Worse
  than if he had.
- **Grounds:** Cold. Raking leaves north of the library with a sophomore named
  Vince who doesn't want to talk. At one point Vince says *you'll get used to it*
  without specifying what he means.
- **Chen:** Crandall 304. Small office, two desks, one window facing a brick
  wall. Rebecca Chen, ~21, cardigan. Studies the player for two seconds longer
  than comfortable. Hands them a folder of *Journal of Monetary Economics*
  reprints and a legal pad. *Mark anything about forward rate expectations.
  Don't summarize. Just mark the passages.* Rebecca reads her own book but
  doesn't turn a page the whole time. The player realizes at forty minutes in
  that she is watching them work.

---

### L4 — The Tuesday Commitment
**Slug:** `s_w2_tuesday_commitment`
**When:** Sun Day 13 evening
**Where:** Room 214
**Primary stream:** All (reflection landmark)

Reflection scene. The player, back in their room, mentally lays out Tuesday
evening's schedule. Four pulls for one slot:

- Priya's Western Civ study group, 8pm, Keith's room (from L5 of Week 1 or
  equivalent Priya deposit)
- ARPANET terminal, 8pm — quietest window (from Glenn's Day 1 directive or
  equivalent opportunity flag)
- Library shelving shift, 8-10pm (only if L1 = library)
- Scott's half-asked movie invitation

Terminal choice. The other three happen without the player. This is the week's
capstone collision.

The scene itself is short — the player sitting on their bed with the paper
schedule from their back pocket. What makes it land is that all four pulls have
texture from prior beats: Priya is real because of the grilled-cheese scene,
Scott is real because of the dry cereal, the terminal is real because Glenn's
directive is still in the player's head from Week 1.

---

### L5 — The Post
**Slug:** `s_w2_the_post`
**When:** Tue Day 15 evening (technically first day of Week 3, but gated by L4)
**Where:** Whitmore Hall basement (ARPANET terminal)
**Primary stream:** ??? (frame / investigation)
**Gated by:** Choosing the terminal at L4

#### What it is
The investigation landmark. The ARPANET terminal in this game is a proto-Usenet
space that real players can read and post in — a shared speculation layer where
Knowers find each other through text. Infrastructure for this is not yet wired
up; content gets written now and hooked in later.

The Post is one of the first seed threads Claude drops into this space. Multiple
players will find it in their own playthroughs and discuss it sideways with each
other.

#### The thread
```
Newsgroups: net.politics
Subject: Soviet grain dependency — data sources?
From: jstern@[redacted]
Date: [three weeks before Tue Day 15]

Trying to model current USSR hard currency constraints given
grain import levels since 1979. Anyone have access to CIA unclassified
series or Brookings projections on foreign exchange reserves? Also
interested in sustainability analysis on Western Siberian oil —
specifically whether peak production 1982-83 is load-bearing or if
there's slack.

Research project, not homework. Will share findings.

  - j.s.
```

Two 1983-normal replies: one recommending a 1982 Brookings report, one asking
what the research project is. `jstern` has not answered either.

#### Why the thread is a tell
The question isn't impossible for a 1983 researcher. The *combination* is the
tell. Grain dependency plus hard currency reserves plus Siberian oil
sustainability is a set of load-bearing questions about whether the Soviet
economy can hold together. In 1983, Soviet studies almost uniformly assumed it
could. Asking whether the oil is *load-bearing or if there's slack* implies the
poster is already thinking about collapse scenarios. That framing was fringe in
1983.

A Knower is asking because the bleed told them the system cracks, and they're
trying to figure out *when* the cracks were already showing and *whether* a
person with future knowledge could do anything about it.

The thematic payload: **in 1983 no one thought the Soviet Union was fragile.**
It had been there for 66 years and felt eternal. The player's bleed gives them
the fact of collapse but not the mechanism. The thread is where investigation
begins — not with certainty, but with specific, researchable questions about
load-bearing infrastructure.

#### Choices at the terminal
- **Reply with a contribution.** Draft a post that adds something — a source, a
  counter-question, a piece of information. Marks the player's presence in the
  thread. Other players may read the reply. Terminal choice.
- **Lurk and read.** Read carefully, click through to other `jstern` posts if
  the system allows. No commitment.
- **Bookmark and leave.** Note the thread. Come back later. Deferred.
- **Log off without acting.** The thread will age.

#### What this landmark does
- First real data point in an arc-long investigation chain. Later seeds will add
  threads on Polish Solidarity, Afghanistan's drain on the Soviet economy, the
  computing gap, Chernobyl precursors, etc. Each thread contributes a piece.
- First concrete activation of Glenn's *find the others, work together*
  directive. Working together means reading the same threads and talking about
  them.
- First moment the player can *contribute* to the shared investigation instead
  of absorbing. The reply choice is the real commitment.

#### What this landmark refuses to do
- Does not explain time travel, the collapse, or the endgame.
- Does not name `jstern`'s motivation. The poster could be anyone trying to do
  anything. Speculation is the point.
- Does not set any hidden tracker on the player. The stance system has been
  dropped — see "What we're dropping" below.

#### Tonal target
Disco Elysium for the text on screen; Carver for the framing around it (the
empty basement, the CRT hum, the walk back across the dark quad, Scott asleep
when the player gets in).

---

## Week 2 beats

Seven beats drafted, interleaved with the landmarks. Each is 10-20 sentences,
mostly prose with 2-3 micro-choices, small-or-no system effects. Beats carry
the week's feeling; landmarks carry its weight.

**Held at seven pending playtest feedback.** Four additional beats were
identified as candidates (Mike studying with door cracked, Keith doing something
practical, a Bryce party invite, Scott on the hallway phone with his mom) but
are deliberately not being commissioned yet. First we see whether the existing
ratio of landmarks to texture lands for players.

### Drafted beats

- **The Pay Phone Line** (Mon Day 7 evening) — Two strangers ahead of the player
  at the floor phone. One arguing with his mother, trying to keep his voice down
  and failing. The other reading a paperback with the cover bent back. The
  receiver is warm when it's the player's turn. Three micro-choices: dial home,
  dial Pat at Ohio State, hang up. No system effects.

- **Scott, Cereal, 11pm** (Tue Day 8 night) — Scott eating dry Rice Krispies in
  the dark with a Tigers game on AM radio. Desk lamp on, overhead off. Sparky
  Anderson being interviewed about a loss. Scott offers the box. Four
  micro-choices. The scene is the box and the game and the desk lamp. No system
  effects.

- **Heller's Lecture, Something Off** (Tue Day 8 morning) — Professor Heller
  makes a dry observation about primary group bonds being underestimated by
  students at the start of college and overestimated by the end. Tomás (grading
  at the side TA desk) stops his pen for three seconds. The player is the only
  one who notices. No micro-choice. Eight sentences.

- **Miguel's Guitar** (Thu Day 10 afternoon) — Miguel in his open doorway,
  acoustic guitar with a scratched finish and one off-color tuning peg, trying
  and failing to play the opening of "Stairway to Heaven" in the same place
  every time. Keith two doors down has his door closed. Miguel sees the player:
  *hey, you play?* Three micro-choices.

- **Priya in the Dining Hall** (Fri Day 11 lunch) — Priya sits down uninvited
  with a dining hall grilled cheese, a library copy of *The Second Sex*, and an
  unsolicited two-minute monologue about her sister's engagement to a guy she
  doesn't like. Ends by inviting the player to Tuesday's Western Civ study
  group.

- **Doug's Story About His Coach** (Sat Day 12 evening) — Common room, SNL on
  low, nobody watching. Doug tells a long story with three false endings about
  his high school baseball coach Mr. Petrocelli making the whole team run until
  a kid threw up because someone left a bat on the infield dirt. Mike has heard
  it before and laughs anyway.

- **The Headline** (placement flexible — Fri or Sat) — Small divergence beat.
  The player sees a newspaper headline or overhears a news item on a common room
  TV that almost-but-not-quite matches their memory. They can't tell which side
  is wrong. No micro-choice, no system effect. This is the "testing memory
  against reality" mode of investigation seeded small, so L5 isn't the only
  place the bleed meets the world.

### Beats held back
- Mike studying with his door cracked
- Keith doing something practical (fixing a drawer, changing a bulb)
- A Bryce party invite that doesn't require a response
- Scott on the hallway phone with his mom (before the letter)

---

## What we're dropping

**The four-stance tracker (Exploit / Improve / Refuse / Investigate) is removed.**
It was too schematic and would have turned player choices into a hidden
personality quiz with predictable payoffs.

Replacement model: factions and groups exist in the world. When the player
encounters them (Arc Two and later), those groups read the player's *actual
history* — what they did, who they talked to, which threads they engaged with,
which they ignored, what they said in replies — and react. No hidden labels. No
stance counter. Organic pattern emerges from content.

Investigation in Arc One is therefore about **gathering data and building
relationships with other Knowers**, not about stance formation. The player is
accumulating concrete information about what went wrong (or will go wrong) with
the 20th century, and building visible presence in shared investigation spaces.
By the end of Arc One, that accumulation puts them in a position where certain
groups find them interesting. The game decides who finds them interesting based
on the trail the player actually left.

---

## Tonal targets

Mistry/Carver carries the beats. Specific physical detail doing the emotional
work: the warm phone receiver from the guy ahead in line, Scott's dry Rice
Krispies in the dark, Miguel's scratched guitar finish, Priya's library copy of
Beauvoir, Doug's three false endings, Keith's closed door, Tomás's pen stopping
for three seconds.

No named emotions. No evaluative one-liners. No "a wave of [emotion] washed
over." No "Part of him wanted X. But another part..."

L5 (The Post) is the one exception in the week — text on a screen carrying
ideas, Disco Elysium register — but its framing (basement, CRT hum, walk home)
stays Carver.

**Week's throughline in one sentence:** *time starts belonging to other people,
and for the first time the player has evidence that somebody else is also
carrying what they carry.*

---

## Decisions & deferred items

| Item | Status | Note |
|------|--------|------|
| ARPANET shared-terminal infrastructure | Deferred | Write content now, wire up later. L5 is playable as a static read if infrastructure isn't ready. |
| `jstern` as a persona | Intentionally ambiguous | Many real people behave like `jstern`. Will be developed later. No backstory now. |
| Four additional beats | Held | Get playtest feedback on the existing seven before commissioning more. |
| The Headline beat placement | Flexible | Can slide in time; place during playtest iteration. |
| L1 pencil addendum subtlety | Held for playtest | See what players do. |
| Collision calendar | Done | See `collision-calendar-week2.md`. |

---

## Playtest feedback targets

The playtest is primarily asking: **does the vibe land?** Specific things to
watch for:

1. **Do players feel weight accumulating across the week**, or does Week 2 feel
   like nothing is happening until Sunday? (The beats are designed to carry
   ambient pressure; if they don't, we need more landmarks or denser collisions.)
2. **Do players notice the Chen posting at L1 without being told?** The pencil
   addendum is the only tell. If nobody picks it, the signal is too subtle.
3. **Do players find The Post unsettling in the right way?** The Soviet-fragility
   framing is the thematic payload. If players read the post as generic political
   curiosity, the tell isn't landing.
4. **Do players who pick the Chen work-study feel something is off about
   Rebecca?** Her stillness during L3 is the only signal.
5. **Do players engage with the shared terminal space socially once it's wired
   up?** (This will be tested later when infrastructure exists.)
6. **Do the seven beats carry the week, or do players want more content?** This
   decides whether to commission the four held-back beats.

---

## Related documents

- `collision-calendar-week2.md` — time slot collision map for this week
- `mmv-lore-bible.md` §1.5 — The Investigation (arc-wide framework)
- `mmv-lore-bible.md` §4.1 — Week 2 architecture stub
- `stream_content_mapping.md` (project-level) — stream shapes and collision
  principle
