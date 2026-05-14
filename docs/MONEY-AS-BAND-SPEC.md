# docs/MONEY-AS-BAND-SPEC.md
# Money-as-band design spec — T-1778077549002 (audit finding §6 #2)

**Status:** PM-locked, build/content tickets filed (T-1778100000001 through T-1778100000004)
**Authored:** 2026-05-07, claude-pm session
**Closes audit finding:** §3.2 / §6 #2 (Bible §3.1.3 violation — Cash on Hand renders as numeric meter)
**Resolves canonical open question:** Current_design.md §XI line 702 ("Is money best introduced via friction events or visible band?") — answer: **visible band**

## 1. Threshold model

**Choice:** Fixed dollar thresholds tuned to weekly baseline.

One tunable constant, three multipliers. Bands re-anchor automatically when baseline tunes — no per-band manual tuning required.

```
WEEKLY_BASELINE_DOLLARS = 20  # initial value, tune post-playtest

band(cash_on_hand) =
  Tight       if cash_on_hand <  1 * WEEKLY_BASELINE_DOLLARS  # < $20
  Okay        if cash_on_hand <  4 * WEEKLY_BASELINE_DOLLARS  # $20–$80
  Comfortable otherwise                                        # $80+
```

**Rationale:** This is fixed-dollar in implementation (no engine query, no pool lookahead) but baseline-relative in *meaning*. "Tight" means "you don't have a week of standard expenses on hand." Phenomenologically grounded; mechanically cheap.

**Out of scope (deferred):** Pure relative-to-week threshold model with engine lookahead into the active pool for `money_effect` outflows. This is the right model for later arcs (irregular income, rent, paychecks) but overkill for Arc One. Defer until at least Arc Two or until playtest data shows fixed-dollar thresholds drift from felt experience.

**Where it lives in code:** `WEEKLY_BASELINE_DOLLARS` in a single constants file (suggest `src/core/economy/bands.ts` or wherever current cash logic lives — Code's call). Multipliers (1, 4) inline in a `computeBand(cashOnHand)` pure function.

## 2. Surface — sidebar element

**Choice:** Persistent visible band element in the sidebar. Always rendered, regardless of band.

**What it shows:** One of three text states — `Money: Tight`, `Money: Okay`, `Money: Comfortable`. No bar, no number. Parallel to the LP/vectors treatment that just shipped in T-1778077549003.

**What it does NOT show:**
- Cash on hand (the underlying number)
- A bar or progress indicator
- Trajectory arrows or recent-change indicators
- Detailed breakdowns

**Rationale:** Honors Current_design.md line 684 ("Subtle money state feedback (no bar)") explicitly. Resolves the §XI line 702 open question in favor of visible band — the answer that lets the player plan against scarcity without reducing scarcity to a meter.

**Visual treatment:** Code's call within design constraints. Suggest text-only, weight-distinct from Tight/Okay/Comfortable so the band is glanceable. No color-coding by default (Tight in red would over-dramatize and pull weight away from the transition beats).

**Where it renders:** Sidebar, alongside the vectors element from T-1778077549003. Same component family.

## 3. Transition trigger model

**Choice:** Latched, with full-day re-arm.

**Mechanics:**
- A band crossing fires its transition beat **once** per crossing direction
- After firing, the beat re-arms only after the player has been **stably in the new band for one full day** (24 in-game hours, or one full day-cycle in segment terms — Code's call which is more natural)
- Stable means: at the end of the day-cycle the player is still in the new band

**Worked example:**
- Day 5 morning: Player in Okay ($45). Pays $30 for a thing. Crosses to Tight ($15). Okay→Tight beat fires.
- Day 5 evening: Parental check arrives, +$30. Now $45, back in Okay. Tight→Okay beat does NOT fire — the engine sees this as flickering, not a stable crossing.
- Day 6 morning: Player still in Okay. Tight band is now re-armed (it's been a full day since last crossing into Tight). If player crosses back to Tight later, beat fires again.

**Rationale:** Per-event firing was considered and rejected — money in college freshman week comes in lumps and goes out in small chunks, so net-zero days are common. Per-event would fire 2–4 transition beats in a single segment, undoing the crystallizer weight Bible §8 prescribes.

**State surface required:** One new field per band, e.g. `daily_states.money_band_state` JSON column with `{ current_band, current_band_entered_at, last_fired: { okay_to_tight: timestamp, tight_to_okay: timestamp, ... } }`. Code's call on exact shape — could be normalized into existing economy state.

**Open question for playtest:** Whether full-day re-arm is too long. If players experience legitimate band oscillation around real life events (parental check arrives reliably every Sunday, regular Tuesday vending spend), a full-day re-arm might suppress legitimate beats. Revisit post-playtest. Shorter re-arm (one segment) is the fallback.

## 4. Transition content map

Mixed register — full storylets for the Tight crossings, NPC commentary lines for the upper crossings.

### 4.1 Full storylets (2)

**`money_okay_to_tight` — the bite**
- **Trigger:** band crossing Okay → Tight, latch armed
- **Pool injection:** high priority (per §5)
- **Dramatic register:** crystallizer-grade. The moment scarcity becomes real.
- **Content brief (separate ticket — T-1778100000002):**
  - Setting: location-flexible (vending machine, payphone, dining hall checkout, dorm laundry)
  - Beat: player wants/needs something small, can't afford it, has to choose between not having it and finding the money some other way
  - Prose constraints: Mistry-grade specific physical detail. No naming the emotion ("you felt anxious"). No symmetrical constructions. The math should be in the prose ($1.25 vending, you have $0.75, you stand there).
  - Choice texture: at minimum two micro-choices (walk away / try to scrape together) and one terminal that resolves to a small loss either way
  - Identity tags: `safety` and/or `confront` depending on choice — should write to LP via the now-fixed track-storylet handler (caece42)

**`money_tight_to_okay` — the relief, source readable**
- **Trigger:** band crossing Tight → Okay, latch armed
- **Pool injection:** high priority (per §5)
- **Dramatic register:** crystallizer-grade, lower intensity than the bite — relief carries less narrative weight than crisis but the *source* matters
- **Content brief (separate ticket — T-1778100000003):**
  - The prose must establish how the money came back. Three plausible sources:
    - Parental drip-feed (envelope from home, money order)
    - Earned (campus job, tutoring, returning bottles)
    - Lucky/found (forgotten ten in a coat pocket, won a bet)
  - Code at trigger time sets a `money_return_source` flag on the storylet so the prose variant matches reality (Code may need to track which deposit caused the crossing — engineering call)
  - Prose constraints: same as above. The relief should be specific and small ("you bought the laundry detergent you'd been borrowing from Scott") not abstract
  - Identity tags: `safety` accumulates. Choice texture: one or two micro-choices plus a terminal

### 4.2 NPC commentary lines (8) — separate ticket T-1778100000004

For Okay→Comfortable and Comfortable→Okay crossings — quieter beats. NPC-specific lines fire when the relevant NPC is in scope at the time of crossing. If no listed NPC is in scope, beat is deferred to next interaction with one.

**Cast:** Scott, Mike, Karen, hallmates (composite — any of Doug/Keith/Miguel/the floor as a generic "someone on the floor")

**Lines required (8 total):**

| Crossing | Speaker | Tone |
|---|---|---|
| Okay → Comfortable | Scott | quiet, observational — Scott notices money things; this is consistent with him as relational-line carrier (`scott_noticed_something` arc flag) |
| Okay → Comfortable | Mike | brisk, transactional — Mike is the pizza-fund collector; his noticing is about resource flow |
| Okay → Comfortable | Karen | dry, slightly evaluative — Karen tracks who has agency in the world; money is part of that |
| Okay → Comfortable | hallmates | ambient — overheard or offhand, not a direct address |
| Comfortable → Okay | Scott | quiet, no judgment — the without-crisis spend-down |
| Comfortable → Okay | Mike | brisk, knowing — "spent it down, huh" register |
| Comfortable → Okay | Karen | observational, slight friction — Karen has period-friction texture available, and "you used to be flush" lands harder from her |
| Comfortable → Okay | hallmates | ambient — not directed at player |

**Prose constraints (apply to all 8):**
- One to three sentences each
- Specific, not evaluative — "you've been getting coffee at the deli instead of the cafeteria" not "you're spending more freely"
- No mention of the band name itself ("Comfortable") — that's UI vocabulary, not in-world vocabulary
- No prediction or warning ("you should be careful") — retrospective only, per the history-rhymes-doesn't-repeat principle

## 5. Pool/slot integration

The 2 transition storylets enter the pool at high priority when triggered. **They use whatever slot-priority mechanism T-1778077549001 (slot-guarantee parent) lands on.** This spec deliberately does NOT design a parallel slot-priority system.

**Implication for sequencing:** money-as-band engine work can ship before T-1778077549001 lands, but the transition storylets' actual *guarantee* of being served depends on the slot-guarantee work completing. Until then, transition storylets enter the pool as standard high-priority items and can be crowded out by routine commits in the same way audit §4.1 documented for friction beats.

**Acceptable interim behavior:** if the slot-guarantee work hasn't shipped when money-as-band ships, transition beats *may* get crowded out occasionally. This is a known-and-acceptable degradation, identical to the current friction-beat behavior. Do not patch with parallel priority logic; wait for T-1778077549001.

## 6. State surfaces

**Engine reads:**
- `cash_on_hand` (existing)
- `daily_states.money_band_state` (new, per §3)
- Storylet pool (existing) — for high-priority injection

**Engine writes:**
- `daily_states.money_band_state` updates on every cash change
- `choice_log` events: `BAND_TRANSITION` with from/to bands, source data, and which beat fired (or nothing if latched)
- `terminalResolve.lifePressure` — via the existing `bumpLifePressure` path on transition storylet completion (track handler now wires this, per caece42)

**Engine does NOT write:**
- Cash on hand (still owned by existing economy code; band is a derived view)
- Identity vectors directly (LP write happens through storylet `identity_tags` only)

## 7. Out of scope

- Pure relative-to-week threshold model with pool lookahead (deferred to later arcs)
- Dynamic baseline (e.g., baseline that scales with player level or arc) — single constant for now
- Irregular income modeling (parental drip-feed timing, paychecks, side income variance) — out for Arc One
- Color-coded band rendering, trajectory indicators, change-rate displays — explicitly anti-pattern per Current_design.md line 684
- Band-aware NPC dialogue beyond the 8 commentary lines — could expand later; not part of this spec
- Rich source-of-money modeling beyond the three categories named in §4.1
- Money-band feedback into the reflection engine — the reflection spike T-1778077549005 will decide what state surfaces it reads; this spec just makes the data available

## 8. Tickets filed (2026-05-07)

1. **T-1778100000001** — Code build ticket. Engine + sidebar + transition trigger + state surface + DECISIONS.md entry.
2. **T-1778100000002** — Content: `money_okay_to_tight` storylet (the bite). Three-stage pipeline.
3. **T-1778100000003** — Content: `money_tight_to_okay` storylet (relief, three source variants). Three-stage pipeline.
4. **T-1778100000004** — Content: 8 NPC commentary lines for upper crossings. Three-stage pipeline.

All under epic_mmv03mc_breathes (Milestone C — It Breathes), sprint_audit1.

Total content load: 2 storylets + 8 short commentary lines. Roughly half a week of content drafting at standard pipeline pace.

## 9. Open questions for playtest

1. **`WEEKLY_BASELINE_DOLLARS = 20` — is the initial value right?** Set by feel; needs playtest data to tune. If players sit in Okay or Tight too persistently, retune. Easy to change (single constant).
2. **Full-day re-arm — is it too long?** Per §3, may need to shorten to one segment if legitimate band oscillation gets suppressed.
3. **Are the upper-crossing NPC lines too quiet?** Mixed-register treatment may feel under-weighted. Reconsider after first playtest with the system live.
4. **Should `money_return_source` prose variants be Code-determined or content-determined?** Currently spec says Code tracks the deposit cause; alternative is content branches handle the variants based on a player-visible signal.
