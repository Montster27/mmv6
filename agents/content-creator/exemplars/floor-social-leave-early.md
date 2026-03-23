# Exemplar: The Floor Social (People Arc Beat 2 — Leave Early Option)

This is a single choice outcome, not a full storylet. It's included because it's the best single passage in the existing content — a masterclass in rendering avoidance with dignity.

## What Makes This Work
- "You used it on Dana. You used it on Scott. The tank is where it is." — exhaustion as accounting. This is how energy depletion actually feels.
- "Nobody notices, which is both the point and the problem." — one sentence, two truths, neither explained.
- "You hear Miguel's laugh from down the hall — sudden, real, slightly too loud. You know it's him even though you don't know his name yet." — the player hears someone they haven't formally met. The game system (knows_name = false) is rendered as lived experience.
- "You tell yourself this is fine. It mostly is." — the gap between "fine" and "mostly is" does all the emotional work. The narrator doesn't explain.
- The passage never says "lonely." It never says "anxious." It shows a person in a quiet room hearing other people become a group without them. The reader does the rest.

## Voice Notes
- The narrator is on the character's side. There's no judgment in this passage. Avoidance is rendered as a rational response to depleted energy, not as a failure.
- Physical detail anchors every emotional beat: M*A*S*H reruns, Dana's empty bed, the tape deck being off.
- The sentence rhythm varies: short declaratives ("You close your door.") alternate with longer observational sentences. This creates the feeling of someone processing a quiet room.

```json
{
  "id": "leave_early",
  "label": "Stay for Scott's part, then slip out when the socializing starts",
  "energy_cost": 0,
  "time_cost": 1,
  "reaction_text": "You stay for the rules. You stay for the Coke and chips. You do not stay for the part where twenty strangers pretend they're comfortable.\n\nIt's not that you don't want to — or maybe it is. You're not sure. What you know is that the energy it would take to walk up to someone and say the right thing and mean it, or at least perform meaning it, is more than you have right now. You used it on Dana. You used it on Scott. The tank is where it is.\n\nYou slip out during the transition. Nobody notices, which is both the point and the problem.\n\nThe hallway is quiet. Everyone is in the common room becoming a floor, and you're walking back to your room alone, and the distance between those two things is something you can feel in your chest.\n\nYou hear Miguel's laugh from down the hall — sudden, real, slightly too loud. You know it's him even though you don't know his name yet. You heard it earlier, when he asked Scott about the waffle iron.\n\nYou close your door. Dana's tape deck is off. His bed is empty. He's still in there, being social. You sit on your bed in the quiet room and tell yourself this is fine. It mostly is.",
  "identity_tags": ["avoid", "safety"],
  "sets_stream_state": { "stream": "people", "state": "withdrawal" },
  "outcome": {
    "text": "",
    "deltas": { "energy": 2, "stress": -1, "resources": {} }
  }
}
```
