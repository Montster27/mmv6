# Day 1 (in-game) — Walk Notes
> Game uses 1-indexed day_index. Day 1 = audit "Day 0" (player's first day in-game).

## Storylets fired (in order)
- **Morning**: room_214 chain (THE ROOMMATE) → dorm_hallmates (FINDING YOUR PEOPLE)
- **Afternoon**: glenn_pastime_paradise (FIRST OPPORTUNITY / Pastime Paradise) → lunch_floor (FINDING YOUR PEOPLE / The Dining Hall)
- **Evening**: evening_choice (FIRST OPPORTUNITY / First Night) → CAPS mini-game (party path) → outcome card

## Choices taken
- room_214 micro: "Put the duffel down, shake his hand" → "What is that song?" (Stevie Wonder reveal) → terminal "Head out to see what's down the hall"
- dorm_hallmates terminal: "I'll come" (-1 stress, hall-engaged path)
- Glenn: "That's Stevie Wonder. But those aren't his words." → "What am I going to find?" → terminal "Head toward the evening"
- lunch_floor terminal: "Laugh with Doug"
- evening_choice terminal: "Head to Anderson Hall with Doug" (-5 energy, -2 stress) → CAPS WIN 3/5
- SkillsNudge dismissed via "Not now"

## §1 GREEN findings
- Header line "Day 1 · Morning · 16h Left · Energy 100 · Stress 0" — all-time visible
- Resource sidebar full panel (Energy/Stress bars + Cash/Knowledge/Social/Resilience/Morale numbers + Vectors)
- Stress impact deltas visible on choice cards (+1 stress, -1 stress, etc.)
- Energy deltas visible on choices (-5 energy on party, -2 on cards)
- NPC name coloring (Scott cyan, Doug orange, Keith red, Mike green) — works in body text
- Multi-beat morning serialization (room_214 → dorm_hallmates) per P1.2
- SkillsNudge "A THOUGHT" card fires after first storylet beat per P2.6
- Outcome cards show delta tags ("-1 stress" green chip)
- Storylet progress bar (multi-color segments, position indicator)
- EARLY BUILD banner persistent
- Pre-game friction-statement card (P3.10) — "BEFORE YOU BEGIN" — single Continue
- Identity-selection card with race/gender/sexuality dropdowns; "doesn't change content yet" disclaimer
- Caps mini-game shell loads, period CRT-style green text, "ROUND N/5 / HITS: M" status
- Caps adaptive difficulty kept tester alive on 5 random space presses → 3/5 WIN
- Time-travel reveal mechanism via Stevie Wonder "Pastime Paradise" (1976) Coolio overlay (1995); explicit reveal "It can't exist. Not for another twelve years."

## §2 / §3 / §4 findings raised on Day 1
- §3: Cash on Hand displayed as `0` (numeric meter) — Bible §3.1.3 says NEVER show numbers in Arc One
- §2: Identity-axis state accumulating (lifePressure events in stateLog) — VECTORS sidebar shows "No vectors yet"
- §2: Build SHA in stateLog (`16b36d5` matches HEAD) but NO header badge
- §2: Tab title "Move My Value" not "Many More Versions"
- §4: First /welcome navigation rendered blank (1/2 reproduce; reload fixed)
- §4 candidate: Energy 100 → 97 after Caps WIN, choice card said -5 energy. -3 actual delta (mini-game success bonus? Unintended? Display mismatch?)

## stateLog surfaces fired Day 1
session-restore, daily-state-mutation, micro-choice, track-resolve. 18 entries by end of morning. Build SHA `16b36d5` on every entry.
