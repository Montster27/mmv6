# New Mini-Game

You are building a new mini-game type for MMV. Follow this process.

## Step 1: Read the Spec

Read `docs/MINI_GAME_DESIGN.md` for the system rules:
- Under 2 minutes to complete
- Binary result: success or failure
- Adaptive difficulty (invisible to player)
- 1983-themed visuals and context
- Triggered from a storylet, results branch to different storylets

## Step 2: Define the Game

Answer these:

1. **What's the core mechanic?** (matching, timing, sorting, dodging, sequencing, etc.)
2. **What are the difficulty factors?** List 2-4 variables that make it harder:
   - Speed, grid size, time limit, category count, target size, etc.
3. **How does difficulty scale?** Which factors change and in what order?
4. **What's the 1983 skin?** How does the visual/narrative context fit the era?
   - Arcade cabinet, card game, campus job task, dorm activity, etc.
5. **What's the retry policy?** Default 3 attempts. Justify if different.

## Step 3: Design the Schema Entry

The mini-game data lives on the storylet. Define:

```json
{
  "mini_game": {
    "type": "your_type_name",
    "difficulty_base": 1,
    "retries": 3,
    "on_success": {
      "target_storylet": "s_slug_success",
      "narrative": "Brief prose bridging back to story on win",
      "deltas": {}
    },
    "on_failure": {
      "target_storylet": "s_slug_failure",
      "narrative": "Brief prose bridging back to story on loss",
      "deltas": {}
    }
  }
}
```

## Step 4: Build the Component

Create a React component in `src/components/mini-games/`:
- Filename: `[TypeName]Game.tsx`
- Must accept props: `{ difficulty: number, onComplete: (success: boolean) => void }`
- Must call `onComplete(true)` or `onComplete(false)` when the game ends
- Must respect the retry count (passed as prop or managed internally)
- Must be self-contained (no external API calls)
- Use Tailwind for styling

### Visual Rules
- Dark background, pixel/retro aesthetic
- No modern UI chrome (no rounded-lg shadows, no gradient buttons)
- Timer display if time-limited
- Score/progress indicator
- 1983 color palette: CRT greens, amber, low-saturation blues

## Step 5: Register the Type

Add the new type to the mini-game framework's type registry so the game engine knows how to launch it. The framework component (TBD) maps `type` strings to React components.

## Step 6: Write Both Storylet Branches

Every mini-game needs TWO downstream storylets:
- **Success path** — something happens because you succeeded
- **Failure path** — something different happens because you failed

Both must feel like real story outcomes. Failure is NOT punishment — it's a different life path. Sometimes failure leads somewhere more interesting.

## Step 7: Test

- [ ] Game launches correctly from a storylet trigger
- [ ] Difficulty 1 is clearly easy
- [ ] Difficulty 3 is clearly challenging
- [ ] Success correctly routes to success storylet
- [ ] Failure correctly routes to failure storylet
- [ ] Retry counter works (game restarts, attempts decrement)
- [ ] Game completes in under 2 minutes at all difficulties
- [ ] Visual style matches 1983 aesthetic
