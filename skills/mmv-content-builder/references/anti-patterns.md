# Anti-Patterns & Editorial Checklist

Run every piece of content against this checklist before finalizing.

---

## Prose Anti-Patterns (Never Write These)

### Emotional Narration
- ✗ "A wave of loneliness washed over him."
- ✗ "She felt a deep sense of belonging."
- ✗ "He was overwhelmed by the enormity of it."
- ✓ Show the feeling through action, physical sensation, or what the character notices.
- ✓ "He sat on the edge of the bed and looked at the phone for a long time."

### Symmetrical Constructions
- ✗ "Part of him wanted to stay. But another part knew he should leave."
- ✗ "On one hand... on the other hand..."
- ✓ Let the tension live in a single concrete detail.
- ✓ "He stood in the doorway longer than he needed to."

### End-of-Paragraph Evaluative One-Liners
- ✗ "And somehow, that made all the difference."
- ✗ "It was the first time he felt like he belonged."
- ✗ "That was the moment everything changed."
- ✓ End on a physical detail or an action. Trust the reader.

### Thesaurus Syndrome
- ✗ "He traversed the corridor."
- ✗ "She relinquished control."
- ✓ Use the word a person would actually think. "Walked." "Let go."

### Over-Polished Metaphors
- ✗ "The campus sprawled before him like an unopened book."
- ✓ Metaphors should match the character's interiority. A freshman from Ohio doesn't think in literary metaphors.

### "As..." / "In that moment..." Openings
- ✗ "As the sun set over the quad..."
- ✗ "In that moment, he realized..."
- ✓ Start with a concrete action or object.

### Characters Articulate About Feelings
- ✗ "I think I'm afraid of failing," Danny said honestly.
- ✓ Danny scratched the back of his neck. "You know that dream where you show up to a test and you haven't studied? I keep having that one."

### Explaining Choices
- ✗ Choice label: "Choose the brave option and confront him."
- ✗ Reaction text: "By choosing to confront Danny, you showed courage."
- ✓ Let the choice label imply. Let the reaction show what happens, not what it means.

---

## Structural Anti-Patterns

### The Prose Wall
7+ sentences of narration before any interaction. Break it up with nodes. If there's an NPC present, they should be talking.

### The Fake Micro-Choice
Three options leading to the same node with no flag differences. If the choice doesn't change anything, cut it.

### The Interrogation
Five micro-choices in a row where you select which question to ask. Mix in NPC-initiated beats, observations, and reactions.

### The Tunnel
Node chain with no branching — auto-advance after auto-advance. That's a prose block with extra clicks. Collapse it.

### The Overloaded Micro-Choice
Sets NPC memory AND fires identity tags AND writes relational effects AND sets a flag. That's a terminal choice in disguise.

### The Dead Branch
Unique node chain that never reconnects and doesn't gate any terminal choices. Either make it matter or cut it.

### The Name Leak
NPC name in a choice label before the player could know them. Labels are visible before reaction_text fires. If the player hasn't met Miguel, the label can't say "Follow Miguel."

### The Consequence-Free Terminal Choice
A terminal choice that costs time/energy but doesn't preclude anything, shift any stream state, or set any NPC memory. If nothing is at stake beyond resource cost, it's not a real choice.

### The Optimal Path
If one terminal choice is clearly better than the others — more rewards, fewer costs, no preclusion — the design has failed. Every path should produce a different life configuration, not a better or worse one.

---

## Period Accuracy Checklist (September 1983)

### Objects That MUST Appear (distributed across storylets)
- [ ] Hallway phone / pay phone
- [ ] Paper class schedule
- [ ] Bulletin board with flyers
- [ ] Typewriter or word processor (not personal computer in dorm)
- [ ] Cassette player / mix tape
- [ ] Physical map of campus
- [ ] Checks for tuition/books
- [ ] Printed newspaper (campus or real)

### Objects That CANNOT Appear
- Smartphones, personal computers in dorm rooms, email, texting, internet
- CDs (not mainstream until mid-late 80s)
- Answering machines in dorm rooms (shared hall phone only)
- ATMs (existed but were rare; most students used bank tellers or checks)
- VCRs in dorm rooms (too expensive for most freshmen in 1983)

### Language That CANNOT Appear
No contemporary therapy/psychology vocabulary:
- "toxic," "boundaries," "triggered," "gaslighting," "self-care," "problematic"
- "reaching out," "processing," "holding space," "safe space"
- "I hear you," "that's valid"

No contemporary social vocabulary:
- "privilege," "intersectionality," "microaggression," "performative"
- "ghosting," "vibes," "energy" (in spiritual sense), "literally" (as intensifier)

### Slang That CAN Appear (sparingly)
"awesome," "rad," "totally," "bummer," "bogus," "gnarly," "dude," "chill out," "no way," "like..." (Valley Girl influence emerging), "preppy," "sellout," "square"

**Rule:** Lightly salted, never saturated. One slang word per page of dialogue, maximum.

### Social Climate Rules
- Homophobia is ambient, not episodic. Characters hold assumptions of their time.
- AIDS is barely in public consciousness in September 1983. Don't reference it unless dramatically justified.
- Racial dynamics exist but are not narrated pedagogically. Show through behavior, assumptions, and micro-moments.
- Gender expectations of 1983 are present in NPC behavior without the narrator evaluating them.
- Full interiority for all characters regardless of background.
- No contemporary vocabulary for any of the above.

---

## NPC Voice Checklist

Before writing NPC dialogue, verify:
- [ ] Does this NPC have an established voice? Check the character bible.
- [ ] Is the dialogue consistent with their background? (Danny from Parma OH sounds different from Miguel from San Antonio)
- [ ] Are they articulate about their feelings? They shouldn't be. Almost no 18-year-old is.
- [ ] Do they use period-appropriate language?
- [ ] Is the player meeting them for the first time? If so, `introduces_npc` must be set and the name cannot appear in labels before introduction.

---

## Final Pass Questions

After writing any content, ask:
1. Could a thoughtful reader identify this as AI-written? If any sentence triggers that suspicion, rewrite it.
2. Is there a sentence that names an emotion? Rewrite it to show the emotion through action or physical detail.
3. Is there a perfect, tidy resolution at the end of a beat? Life doesn't resolve tidily. Cut the resolution or complicate it.
4. Does every micro-choice change something? If not, cut the ones that don't.
5. Would this feel different on a second playthrough? If the nodes and micro-choices don't create variation between runs, the conversation tree isn't doing its job.
