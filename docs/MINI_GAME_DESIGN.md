# MMV — Mini-Game System Design

---

## What Mini-Games Are

Mini-games are small, self-contained games that interrupt the storylet flow. They are triggered by a storylet, run a game, and produce a binary result (success or failure) that routes the player to different downstream storylets.

They are **not** decorative. They produce consequences.

---

## How They Work

1. A storylet triggers the mini-game at a specific point in the scene
2. The mini-game launches (overlay or full-screen — TBD)
3. The player plays the game
4. The game produces a result: **success** or **failure**
5. Each result links to a different storylet or storylet branch
6. The storylet flow resumes on the appropriate path

---

## Difficulty Scaling

Every mini-game has difficulty factors that adjust based on the player's cumulative performance across previous mini-games.

- Players who have done well face harder versions
- Players who have struggled face easier versions
- This keeps the games challenging but not punishing

Difficulty is NOT visible to the player. It adjusts silently.

---

## Retry System

Each mini-game instance has a defined number of retries. This can vary:
- Some games give 3 attempts
- Some give 1 (high stakes)
- Retry count can itself be a difficulty factor (fewer retries at higher difficulty)

---

## Current Mini-Games

### 1. Memory Card Game
A grid of face-down cards. Player flips pairs to find matches.

**Difficulty factors:**
- Time cards remain face-up before flipping back down
- Number of cards in the grid (e.g., 4x3 → 4x4 → 5x4)
- Number of retries allowed

**1983 theming:** Cards could show period-appropriate images — album covers, campus landmarks, dorm objects.

### 2. Caps
The drinking game. Player tosses bottle caps at a target.

**Difficulty factors:**
- Target size / distance
- Timing window for release
- Wind/wobble factor
- Number of rounds

**1983 theming:** Already period-native. Bottle caps, plastic cups, dorm room setting.

---

## Future Mini-Games (Defined as Needed)

### Sorting / Categorization Game
Player must quickly sort items into the correct category under time pressure.

**Example skin:** Player has a bartending job. Beers go to one line, wine spritzers to another. Categories switch up as the game progresses. Speed increases. Faster pace → more mistakes → accuracy/speed tradeoff determines success.

**Difficulty factors:**
- Speed of items arriving
- Number of categories
- Categories swapping mid-game
- Time limit

**1983 theming:** Bartending at a campus bar, sorting mail in the campus mailroom, shelving books at the bookstore, sorting records at a record store.

### Snake
Classic snake game — player navigates a growing trail, avoiding collisions.

**Difficulty factors:**
- Speed
- Board size
- Obstacle placement
- Target score to succeed

**1983 theming:** Could be presented as an arcade cabinet in the student union. Period-accurate pixel aesthetic.

### Other Brain Training Games (TBD)
Pattern recognition, sequence memory, spatial reasoning, reaction time. Each will be skinned to fit a 1983 campus context and will follow the same framework: difficulty factors, retry count, binary success/failure output linking to storylets.

---

## Data Schema

Mini-game data lives on the storylet as an optional field:

```json
{
  "mini_game": {
    "type": "memory_cards" | "caps" | "sorting" | "snake" | ...,
    "difficulty_base": 1,
    "retries": 3,
    "on_success": {
      "target_storylet": "s_next_success",
      "narrative": "You cleared the board. Something clicks — a flash of recognition...",
      "deltas": { "energy": -1, "stress": -1 }
    },
    "on_failure": {
      "target_storylet": "s_next_failure",
      "narrative": "The cards blur together. You lose track.",
      "deltas": { "stress": 1 }
    }
  }
}
```

**`difficulty_base`** — starting difficulty for this instance (1-5). The engine adjusts this based on the player's cumulative mini-game performance.

**`retries`** — how many attempts the player gets for this instance.

**`on_success` / `on_failure`** — each contains:
- `target_storylet` — the storylet slug to route to
- `narrative` — short prose that bridges the mini-game result back into the story
- `deltas` — optional resource/state changes applied on this outcome

---

## Design Rules

1. **Every mini-game must be completable in under 2 minutes.** Longer breaks the narrative flow.
2. **Success and failure must both feel like real story outcomes.** Failure is not "game over" — it's a different life path. Sometimes failure leads somewhere more interesting.
3. **All games must be skinnable to 1983.** No modern UI aesthetics. Pixel art, analog textures, period objects.
4. **Difficulty must be invisible.** The player should never see a difficulty number or know the system is adjusting.
5. **Mini-games are rare.** Arc One has 2-3 total. They're seasoning, not the main course.
6. **The contact's words frame them:** "Mental games that pop up. I don't know how they do it, but they do. Run the game, see what it tells you." — The mini-games should feel slightly uncanny, planted, not fully explained.
