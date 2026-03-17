# Exemplar: The Hallway (Opening Beat 1)

This is the game's opening scene. Note: single choice (no branching), pure atmosphere and déjà vu establishment. Every sentence is grounded in physical detail.

## What Makes This Work
- Sensory specificity: "industrial cleaner and someone else's shampoo" — two concrete nouns, one intimate
- Déjà vu rendered without being named: "you know the next three notes before they come"
- Forward pull in every paragraph — the hallway leads to the room, the room leads to the door
- Period texture through objects: masking tape, sneakers as doorstops, paper schedule in back pocket
- The "feeling passes before you can hold it" — demonstrates trusting the reader

```json
{
  "slug": "arc_opening_hallway",
  "title": "The Hallway",
  "body": "The hallway smells like industrial cleaner and someone else's shampoo. Doors propped open with sneakers and milk crates. A hand-written banner — \"Welcome Class of '87\" — droops from a strip of masking tape over the common room door.\n\nSomewhere behind a closed door, someone is playing a song you almost recognize. You can't name it, but you know the next three notes before they come. The feeling passes before you can hold it.\n\nYour room number is written on the paper schedule folded in your back pocket. Second floor, end of the hall. The door is already open.",
  "choices": [
    {
      "id": "enter_room",
      "label": "Go in",
      "reaction_text": "The hallway stretches behind you. Voices overlap from open doors — introductions, small talk, the same questions asked and answered a dozen times over. Someone laughs too loud. Someone drags a box across linoleum.\n\nYou find the door. Your name is on a strip of masking tape beside another name you don't know yet.\n\nYou step inside.",
      "identity_tags": [],
      "energy_cost": 0,
      "time_cost": 0,
      "next_step_key": "opening_s2_room"
    }
  ],
  "tags": ["arc_one", "opening", "deja_vu"]
}
```
