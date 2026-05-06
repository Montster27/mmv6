# Day 0 / Game Day 1 — Walk Notes

## Initial state after welcome flow
- URL: https://mmv-sigma.vercel.app/play (auto-redirected from /welcome after identity Begin)
- Page header: "Play" / "Day 1 · Energy — · Stress —"
- stateLog: 2 entries, both `surface: session-restore` — sha=16b36d5 matches HEAD ✓
- userId: f208bd3e-f410-4b29-a145-a5fe1c75e7dc (15try@mmvstudios.com — fresh playtest)

## Right sidebar resource panel (on first load)
Energy: —    (em-dash placeholder; should this be a number after session-restore?)
Stress: —    (em-dash)
Knowledge: 0
Cash on Hand: 0    ← FINDING: number, not band — VIOLATES Bible §3.1.3 "Never display exact numbers in Arc One"
Social Leverage: 0
Physical Resilience: 0
Morale: —    (em-dash)

VECTORS section: "No vectors yet. / Your direction is still forming."
Skill Web button at bottom of sidebar.

## Storylet panel (initial render)
Two left panels and one middle panel showing skeleton-loader shimmer rectangles. Header copy: "Set your focus for today / Balance your time across the day ahead." After 5s wait, still skeletons. Need longer wait or storylet didn't resolve.

## Header observations
- No build SHA badge visible (per spec it should be in header). Build SHA only available via stateLog entries. §2 invisible finding.
- Tab title still "Move My Value" — wordmark is "Many More Versions" — divergence persists.
- EARLY BUILD banner visible top of viewport with "Got it" dismiss.

## Day 1 morning walk (game day 1 = audit "day 0")
Storylets fired (in order):
1. **room_214** (THE ROOMMATE chain): Scott intro with name colored cyan; cassette-melody déjà vu beat with Scott naming "Stevie Wonder. Pastime Paradise." (1976 source of Coolio's 1995 "Gangsta's Paradise" — clever time-travel hint mechanism). Picked: "Put the duffel down, shake his hand" → "What is that song?" → "Head out to see what's down the hall"
2. **dorm_hallmates** (FINDING YOUR PEOPLE): Doug introduces self + Mike + Keith. Three terminal choices visible with stress deltas. Picked: "I'll come" (-1 stress, hall-engaged path)

## Visibility GREEN findings (Day 1 morning)
- Header status line: "Day 1 · Morning · 16h Left · Energy 100 · Stress 0" — all four primary resources visible at all times
- Resource sidebar: Energy/Stress as bars with numerals, Cash/Knowledge/Social Leverage/Physical Resilience/Morale as numerals
- **Stress impact shown as delta on choice cards BEFORE click** (+1 stress, -1 stress) — excellent at-decision visibility
- NPC name coloring works (Scott in cyan)
- Multi-beat segment serialization (room_214 → dorm_hallmates) per P1.2
- **SkillsNudge "A THOUGHT" card** fires post-first-beat per P2.6 — "Look at skills" / "Not now" — direct entry point to /skills queue
- Outcome cards show choice reflection prose + delta tags (e.g., "-1 stress")
- "Continue to afternoon →" collapsed-bottom-CTA pattern per aa062d8
- Storylet progress bar (multi-color segments) shows player position within conv-node graph
- EARLY BUILD banner persistent across all surfaces

## Visibility RED/§2 findings (Day 1 morning)
- **Cash on Hand displayed as "0" (number)** — Bible §3.1.3 says NEVER display exact money numbers in Arc One. UI violates design.
- **VECTORS sidebar shows "No vectors yet. / Your direction is still forming."** — but stateLog confirms `dailyStates.lifePressureState` and `microChoice.lifePressure` ARE firing per choice. Identity-axis state IS accumulating in DB; player sees nothing. §2 invisible-but-built finding.
- **Build SHA badge missing** from header — only available via stateLog programmatic introspection
- **Stress shown as 0 in panel after "-1 stress" outcome card** — possible cap-at-0 OR panel doesn't update until segment advance. Mid-segment resource UI may be stale.
- **Tab title "Move My Value"** not "Many More Versions" or "MMV"

## stateLog evidence (Day 1 morning)
18 entries by segment-end. Surfaces fired: session-restore, daily-state-mutation, micro-choice, track-resolve. Build SHA in entries: 16b36d5 (matches HEAD).
