# Exemplar: Dana (Opening Beat 3 — Roommate Introduction)

This is the first meaningful choice in the game. Three options that set the roommate stream state. Note how each choice label is a different *approach* to the same moment, not three tonal variations.

## What Makes This Work
- Body text: "recalibrating" does enormous character work in one word
- "the expression of someone who knows this conversation is required but hasn't figured out how to start it naturally" — this is how people actually behave
- Physical grounding: greasy bag, whiteboard, block letters. The room is real.
- Choice labels range from vulnerable ("Tell him where you're from — and what it was like to leave") to practical ("Give a short answer and keep unpacking")
- The "stay_busy" reaction text is the strongest: "Each thing you place makes the room slightly more yours" — the physical action of unpacking carries the emotional meaning of claiming space
- "He eats his sandwich without offering you half" — a tiny consequence rendered through absence

## Voice Notes
- Notice the narrator's slight wryness: "the expression of someone who knows this conversation is required"
- Emotional state shown through action: "He sits on the edge of his bed, hands on his knees" — this is nervous, controlled, waiting. The text never says "nervous."
- The "volunteer_real" outcome earns its intimacy: "He laughed about it but his eyes went somewhere else" — one sentence, two emotional registers.

```json
{
  "slug": "arc_opening_dana",
  "title": "Dana",
  "body": "The door opens wider behind you. A guy your age, maybe a little taller, carrying a paper bag from the dining hall. He stops when he sees you — not startled, just recalibrating. Like he'd gotten used to the room being his.\n\n\"Oh — hey. You must be—\" He checks the whiteboard, even though he's the one who wrote on it this morning.\n\nHe puts the bag on his desk. Grease is already soaking through the bottom. The room feels smaller with two people in it.\n\nHe sits on the edge of his bed, hands on his knees, and looks at you with the expression of someone who knows this conversation is required but hasn't figured out how to start it naturally.\n\n\"So. Where are you from?\"",
  "choices": [
    {
      "id": "volunteer_real",
      "label": "Tell him where you're from — and what it was like to leave",
      "energy_cost": 1,
      "time_cost": 0,
      "reaction_text": "You tell him. Not the rehearsed version — the real one. The town, the size of it, what your street looked like from the back seat as you pulled away. You didn't plan to say that last part.\n\nSomething in his posture changed when you did. He leaned back against the wall and told you about his drive up — eleven hours, his dad's truck, a gas station in Pennsylvania where they didn't talk for forty miles after. He laughed about it but his eyes went somewhere else.\n\nNeither of you is performing anymore. For now. The greasy bag sits untouched on his desk. He offers you half of whatever's in it. You haven't eaten since the car.\n\nThe room is still small. But the silence between sentences has a different quality now — not empty, just easy. Like the first draft of something that might work.",
      "identity_tags": ["people", "risk"],
      "sets_stream_state": { "stream": "roommate", "state": "genuine_connection" },
      "relational_effects": { "npc_roommate_dana": { "trust": 1, "relationship": 1 } },
      "set_npc_memory": { "npc_roommate_dana": { "knows_hometown": true, "shared_first_meal": true } },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_roommate_dana", "type": "SHARED_MEAL", "magnitude": 1 }
      ],
      "next_step_key": null
    },
    {
      "id": "keep_surface",
      "label": "Answer the question, keep it light, ask him one back",
      "energy_cost": 0,
      "time_cost": 0,
      "reaction_text": "You give him the easy version. State, town, size of your high school. He nods like he's filing it. He gives you the same back — a place you've heard of but couldn't find on a map, a high school with a name that sounds like every other high school.\n\nYou ask about his major. He asks about yours. You both hedge in the same way — \"I'm thinking about\" instead of \"I am.\" That's a small thing to have in common but you both notice it.\n\nHe pulls a sandwich out of the bag and says the dining hall isn't as bad as it looks. You're not sure if that's true but you appreciate the data point.\n\nThe conversation finds its natural end. He turns on his cassette player — low, not inconsiderate — and you go back to unpacking. The room has a rhythm now. Surface, functional, fine. There's time.",
      "identity_tags": ["safety"],
      "sets_stream_state": { "stream": "roommate", "state": "neutral_start" },
      "relational_effects": { "npc_roommate_dana": { "relationship": 1 } },
      "set_npc_memory": { "npc_roommate_dana": { "knows_hometown": true } },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "next_step_key": null
    },
    {
      "id": "stay_busy",
      "label": "Give a short answer and keep unpacking — you'll talk when you're settled",
      "energy_cost": 0,
      "time_cost": 0,
      "reaction_text": "You tell him the name of your town. He nods. You turn back to the box you were unpacking and start putting shirts in the small dresser that smells like someone else's year.\n\nHe got the message. Not rude, just — occupied. He sits there for a moment longer than feels natural, then turns on his cassette player. Quieter than before. A consideration, or an adjustment. You can't tell which.\n\nYou unpack methodically. Books on the shelf, shoes under the bed, alarm clock on the nightstand. Each thing you place makes the room slightly more yours and slightly less his. He eats his sandwich without offering you half.\n\nThe two of you exist in the same small room without quite being in it together. It's manageable. It's controlled. It's the thing you know how to do when you don't know what else to do.\n\nOutside the door, the hallway is getting louder. Someone is organizing something. You'll get to it. Just — not yet.",
      "identity_tags": ["avoid", "achievement"],
      "sets_stream_state": { "stream": "roommate", "state": "avoidance_start" },
      "relational_effects": { "npc_roommate_dana": { "reliability": -1 } },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 0 }
      ],
      "next_step_key": null
    }
  ],
  "tags": ["arc_one", "opening", "roommate", "relationship"],
  "introduces_npc": ["npc_roommate_dana"]
}
```
