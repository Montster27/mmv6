# Stream Shapes: Content Mapping Methodology

Different streams have different shapes. The method of mapping content must match the shape.

---

## Shape 1: ACCUMULATIVE → Map Forward from Situations

**Streams that use this:** Finding your people, belonging, social trust, roommate relationship

**What it feels like:** Many small deposits that compound. No single moment defines the outcome — the pattern does.

**How to map:**
1. List the NPCs available in this arc segment
2. For each NPC, design 4-6 encounter situations spread across the timeline (interleaved, not sequential)
3. For each encounter, define 2-3 micro-choice paths with small relational deposits
4. Design 1-2 threshold moments that only fire when deposits accumulate (e.g., Danny invites you somewhere real only if reliability > X)
5. Design 1 absence consequence — what the NPC does when the player hasn't shown up enough

**Key risk:** Shapelessness. Without threshold gates, accumulative streams feel like a series of disconnected nice moments. The thresholds give accumulation a payoff.

**Threshold design:**
- Thresholds should feel like natural escalation, not achievement unlocks
- The NPC initiates something they wouldn't have before — they don't announce "we're friends now"
- Good threshold: Danny offers to help you move furniture. Bad threshold: Danny says "I feel like we're really getting close."
- Thresholds should be *noticeable but unnamed* — the player feels the shift without the game labeling it

**Absence design:**
- Not punishment. Just what happens when someone stops reaching out.
- Danny stops propping the door open. Miguel invites someone else. Karen doesn't save you a seat.
- The absence should be visible enough that the player who notices it feels the cost, but not so dramatic that it feels like a penalty notification.

**Example encounters (Danny, Week 1-2):**
```
Day 2 evening: Danny is awake when you get back late
  → talk or go to bed

Day 4 morning: Danny asks about your major
  → honesty vs performance

Day 6 evening: You hear Danny on the hall phone, sounds tense
  → acknowledge or give space

Day 9 (gated: reliability > 2): Danny has two tickets
  → terminal choice: go (time cost) or decline

Day 10+ (gated: < 2 encounters): Danny stops propping door
  → absence consequence, no player action needed
```

---

## Shape 2: CRYSTALLIZER → Map Backward from Peaks

**Streams that use this:** Romantic relationships, identity-defining moral tests, major friendship turning points

**What it feels like:** Long approach → peak moment → lasting consequence. The peak is pre-designed; the approach is accumulated.

**How to map:**
1. Design 3-5 crystallizers for this stream across the full arc
2. For each crystallizer, define gate conditions (NPC memory flags, relational thresholds, identity tag minimums)
3. Work backward: what 4-6 prior situations could generate those flags/thresholds?
4. Design those prior situations as forward-mapped encounters (use accumulative method)
5. Design the miss path — what happens if the player never reaches the gate?

**Key risk:** Railroad feeling. If the approach path feels scripted ("do step 1 then step 2 then unlock the moment"), the peak won't land. The approach must feel organic — scattered across time, interleaved with other streams, shaped by micro-choices the player makes for other reasons.

**Crystallizer design:**
- The peak scene should be the best writing in the game. This is where prose quality matters most.
- Use conversational nodes — crystallizers should be interactive, not cutscenes
- The peak should feel earned but not predictable
- Multiple approach paths should be possible (not one fixed sequence of prerequisites)

**Miss path design:**
- The miss path is as important as the hit path
- Not failure. A different life.
- Show the road not taken *briefly* — a ships-passing moment, the person connecting with someone else
- The player should feel what they missed without the game narrating it
- The world moves on whether you're in it or not

**Example (romantic interest, Arc One):**
```
CRYSTALLIZER: First vulnerable moment (Week 3-4)
  Gate: met_privately + saw_them_real + trust > 3

Approach situations (forward-mapped):
  Week 1: Shared class context → micro-choices about attention
  Week 2: Incidental proximity → approach or observe
  Week 2-3: See them struggling → acknowledge or not
  Week 3 (gated): Private conversation → reveal or withhold

MISS PATH (Week 4, gates not met):
  See them laughing with someone else in the dining hall.
  One sentence. No narration of what you lost.
```

---

## Shape 3: GATE-STRUCTURED → Map Backward from Commitments

**Streams that use this:** Academic progress, career/job, skill development, Herald journalism

**What it feels like:** External deadlines create forced decision points. Commit resources over time or lose access.

**How to map:**
1. Map the arc's calendar — deadlines, applications, due dates
2. Design 2-3 commitment gates that permanently narrow options
3. For each gate, define prerequisites (skill flags, completed tasks, NPC connections)
4. Design 4-8 investment situations that build toward prerequisites
5. Ensure each investment situation collides with something from another stream

**Key risk:** Task-list feeling. "Do X, then Y, then Z to unlock W" is a quest log, not a life. The investment situations must have human texture — the study session where Danny interrupts, the work shift where you overhear something, the professor who notices your effort.

**Investment situation design:**
- Every investment situation should contain a conversation or a human moment, not just a resource transaction
- Use conversational nodes — even a study session has micro-choices about focus, engagement, what you notice
- The collision is the content: the investment competes with something the player wants from another stream
- Make the time cost visible and felt — the player should understand what they're giving up

**Gate design:**
- Gates should feel like real deadlines, not game mechanics
- "The application closes Thursday" not "You need 3 study points"
- Skill requirements should be testable through the narrative, not stat checks — the player who hasn't built studyDiscipline writes a weaker article, they don't get a "requirement not met" popup
- Multiple paths to meet prerequisites when possible (socialEase OR studyDiscipline for the Herald article)

**Example (Herald, Arc One):**
```
GATE: Submit first article (end of Week 2)
  Requires: attended_meeting + drafted_article +
            studyDiscipline >= 1 OR socialEase >= 2

Investment situations:
  Week 1 evening: Herald meeting (collision: floor social)
  Week 1-2 afternoon: Library research (collision: Miguel invites)
  Week 2 morning: Interview source (collision: study group)
  Week 2 evening: Write draft (collision: Danny needs help)

MISS PATH: Deadline passes.
  Karen doesn't mention it. Just stops saving you a seat.
  Stream goes dormant. Can reactivate, but first-mover gone.
```

---

## Shape 4: AMBIENT → No Dedicated Content Map

**Streams that use this:** Sense of the times, period texture, social climate (including 1983 homophobia, early AIDS crisis, nuclear anxiety, Reagan-era economics)

**What it feels like:** Not a stream at all. A pervasive layer applied to everything else.

**How to map:**
1. Build a texture checklist per arc segment (music playing, what's on TV, what's in the news, physical objects)
2. For each storylet in other streams, identify 1-2 insertion points for period texture
3. Design 3-4 ambient intrusion moments per arc segment — tiny beats attached to other storylets
4. Attach as gated nodes within existing storylets, not as separate storylets

**The rule:** If you're designing a storylet *about* 1983, you've gone wrong. 1983 is the water the fish don't notice.

**Social climate rule:** The social norms of 1983 (casual homophobia, racial assumptions, gender expectations) are rendered through character interiority and ambient behavior, never through pedagogical framing. Characters hold beliefs of their time without the narrator evaluating those beliefs. No contemporary vocabulary ("toxic," "problematic," "boundaries") appears anywhere.

**Texture checklist (September 1983):**
- Objects: typewriters, pay phones, physical maps, paper schedules, cassette players, printed flyers, checks for tuition
- Music: The Police, Talking Heads, early R.E.M., Michael Jackson (Thriller ubiquitous)
- News: Beirut bombing, Cold War rhetoric, nuclear freeze movement, recession
- TV: M*A*S*H just ended, MTV still new
- Slang: "awesome," "rad," "totally," "bogus," "no way" — use sparingly, never saturate

**Example (ambient beat attached to Danny scene):**
```
Node in Danny "asks about your major" situation:

  Danny has the TV on. The news is talking about something in
  Beirut. Neither of you is really watching but neither of you
  turns it off.

  No micro-choice. No system effect. Just texture.
```

---

## Interleave Principle

After mapping any stream, overlay it on the collision calendar. Every time slot must have at least two competing pulls from different streams. The content mapping process for any arc segment ends with this calendar.

```
Week 1, Day 2, Evening:
  - Floor social (belonging/accumulative)
  - Danny wants to talk (roommate/accumulative)
  - Western Civ reading due tomorrow (academic/gate)

Player picks ONE. The other two happen without them.
```

The collision calendar is the master document. Individual stream maps are inputs to it. The calendar is the output.
