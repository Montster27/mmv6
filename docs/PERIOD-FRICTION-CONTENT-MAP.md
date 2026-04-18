<!-- /docs/PERIOD-FRICTION-CONTENT-MAP.md -->
<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/ folder in MMV repo       -->
<!-- ///////////////////////////////////////////// -->

# Period Friction: 1983 Sensibility Dissonance — Content Map

> **Purpose:** Map the recurring situations where 1983 social norms collide with
> the player's time-traveler awareness. These are not standalone "issue" storylets.
> They are **ambient texture beats wired into existing and planned storylets** across
> all tracks, with micro-choices that accumulate into a visible social identity.
>
> **Design principle:** The player doesn't get a "confront bigotry" button. They get
> the internal experience of noticing something nobody else notices — and then a
> small choice about what to do with that awareness. The consequences are social,
> not moral. The game doesn't judge. The floor does.

---

## 1. The Tracking System

### 1.1 New Walk Flag Pattern: `friction_response`

Period friction beats use a consistent micro-choice pattern that deposits to a
**new NPC-agnostic tracking dimension** on the player's social identity. This is
NOT a visible meter. It's tracked the same way identity axes (risk/safety,
people/achievement, confront/avoid) are tracked — through pattern, never shown
to the player.

**Proposed tracking tag:** `period_stance`

Micro-choice responses map to three accumulative patterns:

| Response Pattern | Tag Value | What It Signals |
|-----------------|-----------|-----------------|
| **Speak up** | `challenged` | Player visibly pushed back on the norm |
| **Deflect / change subject** | `deflected` | Player showed discomfort without confrontation |
| **Go along / stay silent** | `absorbed` | Player let the moment pass without friction |

No single choice defines the player. The pattern over 6–10 beats across Arc One
creates a social identity that NPCs respond to.

### 1.2 The Floor Is Not Monolithic

**Critical design principle:** Not everyone on the floor talks like this, and not
everyone who does is unreachable. The player who pushes back doesn't just lose
social capital — they **find the people who were waiting for someone else to
say something first.** Resistance creates its own social gravity.

The floor has a spectrum:

- **The talkers** (Doug, Keith, Bryce, Peterson) — use this language casually,
  don't think about it, would be confused if you pressed them on it. Not bad
  people. Just unexamined.
- **The quiet ones** (Mike, and others the player discovers) — hear it, don't
  join in, but don't push back either. They've been navigating this alone.
  When the player challenges, these people *notice* — and they start to find
  the player.
- **The ones outside the floor** (Priya, future NPCs) — have their own experience
  of 1983's norms from the receiving end. The player who challenges builds
  credibility with them that the absorber never earns.

The `challenged` path costs you ease with the majority **and builds an alternative
social network** with people who see what you see. Over time, this network becomes
its own source of belonging — different from the floor's default camaraderie,
but real.

### 1.3 NPC Consequence Mapping

| NPC | Reacts to `challenged` | Reacts to `absorbed` |
|-----|----------------------|---------------------|
| **Doug** | Confused, slightly defensive → reliability −0.5. "What's your deal?" But recovers fast — Doug doesn't hold grudges. Over time, Doug actually *adjusts* around you. He doesn't change his worldview, but he watches his mouth when you're there. That's something. | Doug treats you as one of the guys → reliability +0.5. Easy warmth. |
| **Keith** | Uncomfortable silence. Keith is from rural PA — this is his normal. Trust −0.5. He doesn't dislike you, but you've become *different*. | Keith relaxes around you → trust +0.5. You're safe. |
| **Mike** | Quiet respect. Mike noticed. He won't say so in the moment, but he files it away. Trust +1. After 2+ `challenged` beats, Mike seeks you out privately — a conversation that wouldn't have happened otherwise. Mike becomes a real friend, not just a floormate. This is the **alternative network** forming. | Mike loses a little interest in you. Not hostile. Just… less. Trust −0.5. Mike stays a pleasant acquaintance. |
| **Scott** | Depends on roommate relationship. If trust > 1, Scott asks you about it later (private) — could become an ally. If trust ≤ 1, Scott thinks you're performing. | Scott doesn't notice either way — he's in his own world. |
| **Bryce** | Bryce thinks you're weird. Invitations dry up. Anderson Hall access narrows. | Bryce thinks you're cool. More party invitations. |
| **Priya** | If she witnesses it: sharp interest. Opens a conversational gate that otherwise stays closed. Trust +1. After 2+ witnessed `challenged` beats, Priya initiates — she brings something to *you*. A study group invite. A recommendation. A conversation that goes deeper than the surface track allows. | Priya is polite but keeps distance. Normal track. She never knows what you think. |
| **New NPCs (discovered via challenge path)** | The `challenged` pattern introduces the player to people they'd never have met through the default floor social path. A TA who overhears you in the library. A student from another floor who heard about "the guy who said something." These aren't scripted encounters — they're gated by `period_stance: challenged` count ≥ 2. | These NPCs never appear. The absorber doesn't know they exist. The floor IS their world. |

**Critical design note:** Both paths produce real belonging — but *different kinds*.
The absorber belongs to the floor. The challenger belongs to a self-selected
network that cuts across the floor, across dorms, across social strata. Neither
is better. Both cost something. The absorber's belonging is easier and wider.
The challenger's belonging is harder-won and deeper. The deflector gets a version
of both but fully owns neither.

---

## 2–6: See full document in repo

*[Sections 2-6 covering the three friction categories, accumulation model,
implementation notes, prose guidelines, and open questions are in the full
file at `docs/PERIOD-FRICTION-CONTENT-MAP.md`]*
