# Interaction Modes: When to Talk, When to Tell, When to Choose

Every moment in a storylet falls into one of three modes.

---

## Mode 1: Prose Block
Narrator voice. No interaction. Auto-advances.

**Use when:**
- Setting a scene (arrival, time of day, environment)
- Delivering déjà vu beats (need unbroken rhythm)
- Covering elapsed time ("Three days pass.")
- Solo interiority that doesn't branch

**Max length:** 4 sentences. Split longer passages with auto-advance nodes.

**Danger sign:** If a prose block contains NPC dialogue, it should probably be a conversation node instead.

---

## Mode 2: Micro-Choice
Player picks a line or small action. No resource cost. Shapes tone and information.

**Use when:**
- An NPC is talking to the player (primary case)
- Player's inner monologue could fork
- Information exchange — what to reveal or ask
- You want the player to feel present without committing

**Can do:** Set conversation flags. Set NPC memory (sparingly). Tiny relational shifts (±1). Gate future nodes and terminal choices. Fire identity tags (rarely — most should carry zero).

**Cannot do:** Cost time or energy. Fire preclusion. Set stream state. Carry more than one identity tag.

**Label rules:**
- Dialogue: in quotes. `"It's... a lot."`
- Action: physical verbs. `Lean against the door frame.`
- Length: 3-8 words.
- Feel: something the player would actually say or do, not a thesis about their character.

---

## Mode 3: Terminal Choice
Real decision. Costs time, energy, or both. Fires identity tags. May preclude. Changes stream state.

**Use when:**
- Player commits a scarce resource
- A door closes (preclusion)
- The choice defines who the player is becoming
- There's a real tradeoff between streams

**These feed the reflection engine.** Everything else is texture.

---

## The Rhythm

A well-designed conversational storylet:

```
PREAMBLE (prose, 1-3 sentences)
  ↓
NODE (NPC speaks or situation presents)
  ↓
MICRO-CHOICE (player responds)
  ↓
NODE (world reacts)
  ↓
[repeat 1-2x]
  ↓
TERMINAL CHOICES (real decision)
```

2-4 micro-choice points before terminal choices. More than that → split into two storylets.

---

## Decision Matrix

| Situation | Mode | Why |
|-----------|------|-----|
| Danny asks about your weekend | Micro-choice (conversational) | NPC is talking; player shapes the exchange |
| Walking across the quad at sunset | Prose block | Environmental, no interaction needed |
| Choose: Herald meeting or floor social | Terminal choice | Time cost, stream collision, preclusion |
| Mom asks "How is it?" on the phone | Micro-choice (conversational) | What you say shapes NPC memory and later options |
| Lying in bed, can't sleep | Prose block (or micro-choice if interiority forks) | Solo reflection |
| Miguel invites you to Sal's | Terminal choice if time cost; micro-choice if just deciding tone of response |
| Déjà vu: hallway corner feels remembered | Prose block | Must land with unbroken rhythm |
| Professor calls on you in class | Micro-choice → terminal choice | Conversation leads to real decision (study group, office hours) |

---

## Anti-Pattern: The Mode Mismatch

The most common mistake is putting the wrong content in the wrong mode:

**Long NPC dialogue as prose block:** The player reads about what Danny said instead of hearing Danny say it. Convert to conversational nodes.

**Resource decisions as micro-choices:** "Skip the meeting" should cost time/energy and fire identity tags. That's a terminal choice, not a casual micro-choice.

**Trivial options as terminal choices:** "Pick up the pen" doesn't need time_cost: 1 and identity tags. If it doesn't cost anything real, it's a micro-choice or prose.

**Micro-choices with no effect:** Three options that all lead to the same node with no flag differences. If the choice doesn't change anything — not even a flag — cut it or make it change something.
