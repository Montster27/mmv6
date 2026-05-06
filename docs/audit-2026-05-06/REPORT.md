# MMV Audit Report — 2026-05-06

> **Walk:** Vercel production `https://mmv-sigma.vercel.app` (deployment `mmv-cpncv9d6m-...`, alias of `main` HEAD `16b36d5`, built 2026-05-05 14:51:58 EDT).
> **Tester account:** `15try@mmvstudios.com` (userId `f208bd3e-f410-4b29-a145-a5fe1c75e7dc`). Fresh sign-in confirmed.
> **Walk reach:** Day 1 → Day 9 (game days; 1-indexed). Halted at Day 9 Night by daily-cadence wall ("Come back tomorrow" with no Sleep affordance and no admin advance available to player account).
> **Pre-walk env confirmation:** `NEXT_PUBLIC_SKILL_TIME_SCALE=0.01` ✓, `PRACTICE_CREDIT_SECONDS=900` ✓ (verified via `vercel env pull --environment=production`).
> **Walk plan posture:** Period-stance CHALLENGED on every friction beat encountered; routine commits Week 1 + Week 2 = `Western Civ Reading + Library Study + Hang on the Floor + Free Time` (4/5 budget; only one Free Time button exists despite user's intent to commit two — `commits 5 by checking 5 distinct activities`).

---

## 1. What's visible (works as designed)

| Surface | Driver / data path | Evidence |
|---|---|---|
| **Header status line** "Day N · Segment · Hh Left · Energy · Stress" | [play/page.tsx](src/app/(player)/play/page.tsx) header block | Visible every segment; updates live |
| **Resource sidebar** (Energy & Stress as bars + numerals; Knowledge / Cash on Hand / Social Leverage / Physical Resilience / Morale as numerals) | [ProgressPanel.tsx](src/components/ProgressPanel.tsx) | Persistent right-rail; updates after each terminal resolve |
| **Choice deltas at decision time** (`+1 stress`, `-5 energy`, `+5 knowledge`, sometimes 4-attribute compound) | choice card render | Strongest visibility moment of the walk; saw on `evening_choice` (-5 energy/-2 stress on party), `money_reality_check` (+5 knowledge/+1 stress on study path), `dorm_hallmates` (-1 stress on hall-engaged), Day 8 `job_board` |
| **NPC name coloring** | name-token resolver (per HANDOFF c3d4e Glenn→Terminal NPC name coloring fix) | Doug=orange, Scott=cyan, Mike=green, Keith=red, Bryce, Glenn, Priya, Miguel — visible in body text and dialogue attribution |
| **Multi-beat segment serialization** | per HANDOFF P1.2 / aa062d8 | Confirmed every segment that had ≥2 storylets — they render in sequence with one outcome card visible at a time, single bottom CTA collapses dismissals |
| **SkillsNudge "A THOUGHT" card** | per HANDOFF P2.6 — c3d4e | Fired post-first-storylet on Day 1 morning with "Look at skills" / "Not now" |
| **Pre-game friction-statement card** "BEFORE YOU BEGIN" | per HANDOFF P3.10 | Single Continue, single screen — wording lands well |
| **Identity-selection card** | welcome flow | Race/gender/sexuality dropdowns, defaults Unspecified, "doesn't change content yet" disclaimer present |
| **Caps mini-game shell** | [play/page.tsx:1893](src/app/(player)/play/page.tsx:1893) (`selectedChoice.mini_game`) | Loaded on `evening_choice → go_to_party`. Period CRT-style green text. "ROUND N/5 / HITS: M". Adaptive difficulty kept tester at 3/5 from 5 random-timing space presses → WIN |
| **"Expires today" badge** on near-expiry storylets | storylet card chip | Visible on `Trays Again`, `western_civ_day1`, `floor_hallway_day6` (Beat 2G) |
| **Storylet progress bar** (multi-color segments) | conv-node progress indicator | Player can see how far through they are |
| **EARLY BUILD banner** with "Got it" dismiss | (player)/layout.tsx EarlyBuildBanner | Persistent across all surfaces; copy is well-written |
| **WeeklyCalendar / Plan Your Week** | Phase 4 routine UI | Surfaced 2× in the walk: Day 3 morning (Week 1 commit), Day 7 afternoon (Week 2 commit). Date label, "0 of 5 half-days" counter, category color tags, locked-activity messaging ("You haven't unlocked this yet"). Clean and self-explanatory. **14 activities live** vs Phase 4 spec's 6 seeded — content has expanded substantially. |
| **Time-travel reveal mechanism** | room_214 + glenn_pastime_paradise content | Stevie Wonder's "Pastime Paradise" (1976) heard with Coolio overlay (1995). Explicit reveal: *"It can't exist. Not for another twelve years."* Elegant and lands. |
| **Period_stance instrumentation** | choice handler → stateLog `choiceLog.periodStance` event | Fired on each Beat I encountered (2A, 2C, 2D, 2E, 2F). Counter accumulates server-side (visible in stateLog details) |
| **`stateLog` ring buffer** (`window.__stateLog`) | per HANDOFF Phase 1 instrumentation `a1c807d` | Ring buffer cap 200, surfaces session-restore / daily-state-mutation / micro-choice / track-resolve. Build SHA tagged on every entry (`16b36d5` matches HEAD). |
| **P2.4 skill-gate hide-when-not-met** | dailyLoop.ts choice filter | Confirmed on `heller_lecture` Day 9 morning: with `critical_analysis` untrained, the gated `raise_critical_point` choice was correctly hidden. Only "Class ends" (default-path) shown. |
| **Multi-week routine cadence** | weeklyTick / WeeklyCalendar trigger | Week 1 commit fires Day 3 morning, Week 2 commit fires Day 7 afternoon. Different segment triggers between weeks (engine evidently re-evaluates eligibility per-week). |
| **`ROUTINE_MODE_START_DAY = 3`** observed live | engine constant | Confirmed Phase 4 HANDOFF spec saying `day_index >= 7` is **stale** — actual constant is 3. |

**§1 also worth noting (texture quality):**
- Period detail in body prose is very strong. Specific 1983 anchors land: Def Leppard, Duran Duran, Pyromania vs Thriller, $3.35/hr (period minimum wage), Return of the Jedi poster, Pretenders tape, Beirut barracks news, "the future wearing 1976's clothes," typed-not-printed library job card.
- Alternate-history rule visibly seeded: "grain futures, a temperature, a baseball score from a game that should have gone differently" — Day 2 morning Anderson Hall Residue.
- Glenn directive content rendered cleanly; harvest-pool USENET trace ("for anyone arriving this fall") showed the time-traveler-message device working.

---

## 2. What's invisible (built but not surfaced to player)

This is the most important section.

### 2.1 — Identity-axis vectors (RED)

The **Bible §3.2 axes (Risk↔Safety / People↔Achievement / Confront↔Avoid)** drive the eventual reflection. The system IS firing — `stateLog` shows `dailyStates.lifePressureState` and `microChoice.lifePressure` events on every choice, with `identity_tags` payloads. The DB-side counters accumulate.

**The player sees nothing.** The VECTORS sidebar at [ProgressPanel.tsx:272](src/components/ProgressPanel.tsx:272) renders the static string *"No vectors yet. / Your direction is still forming."* for the entire 9-day walk, even after dozens of identity-tagged choices.

This is the single biggest gap between "system runs" and "player experiences anything." Bible §8 reflection depends on these axes being meaningful at arc-end; with no in-game surface, the player has no opportunity to notice their pattern emerging.

**Evidence:** stateLog entries show `microChoice.lifePressure` with `identityTags` keys present and incrementing. Sidebar copy never changes. Confirmed across 9 days.

### 2.2 — Build SHA invisible to player (YELLOW)

Spec said: "*the header should carry it via NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA plumbing.*" Reality: SHA appears on every `stateLog` entry as `sha: "16b36d5"` and is therefore programmatically verifiable, but **no header badge or user-visible build-stamp surface exists.** A tester filing a bug cannot tell what build they were on without devtools.

Verified by JS probe of `__NEXT_DATA__.runtimeConfig.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` (returned `null`), no 40-char hex strings in page source, no meta tag.

### 2.3 — Tab title "Move My Value" (YELLOW)

`document.title` returns `"Move My Value"` on every player route. In-page wordmark is "Many More Versions" everywhere. Bookmark text and screen-reader announcement get the wrong name. Cosmetic but tester-relevant.

### 2.4 — Stress accumulator unexplained (RED)

Stress accumulated as: 0 → 5 (Day 1 evening) → 14 (Day 3 morning, +9 overnight) → 27 (Day 4 morning, +13) → 23 (Day 5 morning, **dropped 4**) → 25 (Day 6 morning, +2) → 31 (Day 7 afternoon, +6) → 41 (Day 8 morning, +10) → 35 (Day 9 morning, -6). Variance is inconsistent — sometimes climbs ~10/night, sometimes drops a few.

No on-screen explanation per night. The night transition shows `Sleep` → next-day header, no stress-delta toast or summary.

**Suspect site:** [applyResourcesServer.ts:84](src/core/resources/applyResourcesServer.ts:84) sets `stress: 20` as a default; [resourceDelta.ts:56](src/core/resources/resourceDelta.ts:56) clamps stress to 0-100; [allocationEffects.ts:111](src/core/sim/allocationEffects.ts:111) computes `nextStress = clamp(stress + stressDelta, 0, 100)`. The combination probably explains the variance: routine activities (Western Civ Reading academic, Hang on the Floor social) inject stress deltas that aren't surfaced as choices, then night clamping rebalances. Player has zero insight. **Recommend a "How you slept" overlay or sidebar microcopy on day-rollover.**

### 2.5 — Caps mini-game energy delta mismatch (YELLOW)

Choice card: `Head to Anderson Hall with Doug — -5 energy / -2 stress`. After Caps WIN 3/5, Day 1 evening outcome: Energy 100 → 97 (= -3 actual). Stress 0 → 5 (= +5 actual; choice promised -2). **Both numbers diverge from displayed cost.**

Either:
- Mini-game success bonus / failure penalty modifies the displayed delta (intentional but invisible) — §2 invisible
- The displayed delta is misleading — §4 broken

Suspect site: [play/page.tsx:1893](src/app/(player)/play/page.tsx:1893) wires `selectedChoice.mini_game` and presumably routes to a different outcome on win vs loss; the choice card is rendered ahead of mini-game outcome resolution. **Recommend post-mini-game delta toast.**

### 2.6 — Knowledge counter never increments (RED)

Across 9 days, the player encountered: `western_civ_day1` (Western Civ class), `advisor_visit`, `study_group_forming`, `english_comp` (Day 5 morning), `heller_lecture` (Day 9 morning), and committed `Western Civ Reading` (academic) routine for both weeks. The **Knowledge counter remained at 0** throughout. Either:
- Knowledge gain is tied only to choices the auditor never took (e.g., the `+5 knowledge` `Stay in. There's a paper to get ahead of.` option on `money_reality_check`)
- Knowledge from routine activities deposits silently and isn't reflected in the sidebar
- Knowledge is content-gated in a way I never triggered

Worth concrete grep at fix-time. The fact that *seven* academic-content fires + 2 academic-routine commits produced zero player-visible Knowledge is a strong signal something's not wired.

### 2.7 — Routine activity deposits invisible (YELLOW)

Per Phase 4 spec: "Deposit system: Per-activity deposits applied on schedule commit (skill XP, energy effects, money effects)." Across both weeks of commits (Western Civ Reading + Library Study + Hang on the Floor + Free Time), no deposit toast / sidebar pulse / stat-change indicator was visible to the player. Whatever the activities deposit, the player never sees it land.

### 2.8 — Routine interruption mechanism never visibly fired (UNTESTED → YELLOW)

Per Phase 4 spec: "Interruption system: Three triggers — gate threshold trips, calendar beats, NPC patience timers." Across 9 days I observed zero interruption events. Either:
- They didn't trigger for this play pattern
- They triggered silently
- They aren't yet wired

Cannot distinguish without instrumentation. Backlog for next audit pass.

---

## 3. What's missing (designed but not built)

### 3.1 — Reflection Engine (BLACK — confirmed missing)

**Bible §8 specifies a reflection engine.** Second-person past-tense observational portrait at arc-end, reading identity axis skew + missed opportunities + energy/money/skill patterns + NPC relational states. Output is a portrait, not a score: *"You consistently chose the practical path when the social one felt uncertain. The money pressure eased. The cluster you didn't enter formed without you."*

**Pre-walk grep yielded zero matches** for `ReflectionScene`, `ReflectionCard`, `computeReflection`, `endOfArc`, `arc_end`, `arcEnd`, `END_OF_ARC`, or any second-person reflection-text generator. Closest existing surface is `/season-recap` ([season-recap/page.tsx](src/app/(player)/season-recap/page.tsx)), which renders a stats dashboard ("Days played", "Completion rate", "Anomalies found", "Hypotheses written") — useful telemetry but not the design's reflection.

The walk halted at Day 9 before reaching the Day 14+ surface where reflection should fire, but the grep result is dispositive: **the reflection engine does not exist in the codebase**, and the system that consumes the now-accumulating identity-axis state has no destination.

### 3.2 — Money as friction-only (RED, designed-built-wrong)

**Bible §3.1.3:** *"Money changes slowly. Never display exact numbers in Arc One. Express it through friction events and blocked choices, not a visible meter."* The resource sidebar shows `Cash on Hand: 0` as a numeric meter. This is a category-level design violation: a numeric meter teaches the player to optimize a number we explicitly don't want optimized.

**Recommended fix:** Replace numeric `Cash on Hand` with band label (`Tight | Okay | Comfortable`) in Arc One. Numeric exposure can return in later arcs where money tracking is the design intent.

### 3.3 — Money-band UI (designed-not-built)

Even the band model from Bible §3.1.3 isn't built. There's no "tight" / "okay" / "comfortable" label anywhere in the UI. The meter is the whole money UX.

### 3.4 — Glenn's four directives (RED partial)

CLAUDE.md spec: Glenn gives **four directives** — build a strong social network, make money, gain knowledge, work together. The shipped `glenn_pastime_paradise` content gives **one** directive: "Find the computer lab in Whitmore basement, get a login, read the network project. Things that shouldn't be there yet." `glenn_the_walk` (Day 6 morning) is a follow-up beat asking about what the player found, not a fresh-directive scene.

The single concrete directive *works narratively* and is more grounded than the abstract four. But this is a content/design divergence worth resolving — either the spec changed (CLAUDE.md needs update) or the other three directives are missing content. Backlog ticket.

### 3.5 — Day 2 evening + Day 6 afternoon + Day 8 morning (depending on routine) silent skips

Several segment slots silently render no storylet and no UI message. Old GAP-ANALYSIS already flagged Day 2 evening; the 2026-04-20 Days 2-3 content patch did NOT backfill this slot. Day 6 afternoon and Day 8 morning may also be empty pool slots OR were silently consumed by routine commits — either way, the player gets no UI signal that "your routine activity ran here."

### 3.6 — Marketing site `/` has no link to `/welcome` (LOW)

`https://mmv-sigma.vercel.app` shows the MMV Studios marketing landing page — no obvious affordance to enter the game. Cold-tester would land at `/` and have no path forward without typing `/welcome`. Backlog.

---

## 4. What's broken (built but doesn't work)

### 4.1 — Routine commits + period-friction beats compete for the same slots (RED, structural)

**This is the most important §4 finding.** The just-shipped T-1776329282001 period-friction content (4 new pool storylets + 3 retrofits, 2026-05-04) lives in Days 3-9 pool slots. The same slots are routine-commit-eligible from Day 3 onward (`ROUTINE_MODE_START_DAY = 3`). Result of the deliberate collision test:

| Beat | Spec slot | Observed slot | Status |
|---|---|---|---|
| 2A `hallway_morning_day3` | Day 3 morning | Day 4 morning | DELAYED 1 day |
| 2D `study_group_forming` | Day 3 afternoon | Day 4 afternoon | DELAYED 1 day |
| 2C `walk_to_class_day4` | Day 4 morning | Day 5 morning | DELAYED 1 day |
| 2E `priya_dining_hall` | Day 4-6 afternoon | Day 5 afternoon | DELAYED 1 day |
| 2G `floor_hallway_day6` | Day 6 evening (`expires_after_days=0`!) | Day 7 evening | DELAYED 1 day **despite spec's single-day window** |
| 2F `floor_lounge_tv_day7` | Day 7 evening | Day 8 evening | DELAYED 1 day |
| 2B `lounge_cards_night` | Day 9 evening | NEVER FIRED | **MISSED ENTIRELY** |

**Two structural findings inside this:**

1. **Beat 2B got dropped** when Day 9 evening had `scott_cereal` + Hang on the Floor evening commit. There's no carry-forward; the beat is silently locked out.

2. **Beat 2G's `expires_after_days=0` doesn't actually expire.** Per HANDOFF spec: *"single-day window — texture beat doesn't need carry-over."* Live behavior: engine slid Beat 2G forward by 1 day. So the data-model semantic of `expires_after_days=0` doesn't match the design intent. Either the engine's expiry comparison is off-by-one (treats `<=` as `<`), or the spec was wrong, or there's intentional grace.

3. **Cumulative delay** means players who deeply commit routine activities effectively get a different content schedule than the design intended — by Day 9, content originally at Day 3 has slid to Day 4, Day 4 slid to Day 5, etc. The player doesn't know any of this is happening.

**Recommendation:** Beats need either (a) longer expiry windows (none should be `=0`), (b) separate priority over routine-eligible activities so they don't compete for slot capacity, or (c) the routine-mode UI needs to surface "X friction beat is happening this week" or "you missed Y" so the player has a reason to plan around it.

### 4.2 — Daily-cadence wall blocks audit advance (YELLOW)

After Day 9 Sleep resolves, the page shows "Daily complete ✓ / Come back tomorrow" with **no Sleep button, no advance affordance, no admin path for the player.** Per HANDOFF this is intentional: "*ensureCadenceUpToDate removed entirely — day advancement is exclusively sleep-driven*." But once a sleep has fired and we're in Night 4h Left state, there's no in-UI way to roll the day. Either the engine waits on a real-world day boundary (test confirms wall) or the affordance is missing.

This isn't a bug for production — it gates daily play correctly. It IS a problem for testing: an internal tester cannot finish an Arc-One arc in a session, which means the reflection-layer test (the most important Arc-One question) is unreachable in single-session walks unless we add a `?dev=1` advance affordance or admin-only fast-forward.

### 4.3 — `/api/run/reset` returns 401 to player account (LOW)

`POST /api/run/reset` from the playtest account session returned `{"error":"Not authorized"}`. Per HANDOFF this should be the player-callable reset (vs. `/api/admin/dev/reset`). Either auth was tightened recently, or the route has been reclassified as admin without HANDOFF update. Not blocking the walk (welcome flow auto-resets fresh accounts).

### 4.4 — First `/welcome` navigation rendered blank (LOW)

First navigation: white screen, `<body>` empty, JS probe failed with chrome-extension-isolation error. Reload fixed it cleanly. 1/2 reproduce so far. Possibly hydration race or Chrome MCP cold-load timing. Worth a Sentry rule but not blocking.

### 4.5 — "Trays Again" Day 3 afternoon — four duplicate `"What?"` buttons (BROKEN)

Storylet `Trays Again` rendered four micro-choice buttons all with text `"What?"` — visually identical. Likely intended as four NPC-attributed responses, but the UI renders them as undifferentiated duplicate buttons. The player can't tell them apart. Tester would fail to make a meaningful choice. Specific UI bug.

### 4.6 — Chrome MCP `save_to_disk` doesn't surface paths (LOW, audit-tooling)

`save_to_disk: true` on screenshot calls returned an `ID: ss_xxxxx` handle but no resolvable path on disk. Searched `~/Downloads/`, `/tmp/`, `~/.claude/`, `/var/folders/` — nothing. Audit fell back to inline transcript screenshots + grep-able innerText capture. Audit-quality risk; not a product issue. Recommend MCP fix or document the limitation.

### 4.7 — Chrome MCP `read_console_messages` / `read_network_requests` returned empty (LOW, audit-tooling)

Both tools returned empty results across all attempts on this domain after multiple navigations and reloads. Audit fell back to in-page `javascript_tool` for diagnostics. Same audit-tooling flag.

---

## 5. Phase-by-phase verdict

| Phase | Verdict | Reasoning |
|---|---|---|
| **P1.6 — Skill Queue** | **YELLOW (NOT FULLY TESTED)** | Skills page ([/skills](src/app/(player)/skills/page.tsx)) exists and was reachable via top nav. SkillsNudge fires correctly post-first-beat. **Auditor failure: never navigated to /skills, never trained a skill, so the queue UX (active+queued, real-time tick, completion celebration, lazy-tick on fetch) is not directly verified.** Phase 1 plumbing infrastructure is GREEN per stateLog evidence. Walk-plan correction: future audits should mandate `/skills` navigation at Day 1 afternoon as a hard gate. |
| **P2.4 — Skills in Storylets** | **GREEN (with caveat)** | The `requires_skill` hide-when-not-met gating works: `heller_lecture` rendered without the gated `raise_critical_point` choice (critical_analysis untrained). **Verified path: skill-not-met hides correctly.** Unverified path: skill-met shows + practice credit applies (didn't train any skill in walk). The skill_modifier alt-text path on `lunch_floor.laugh_with_doug`, `glenn_pastime_paradise.head_to_evening`, etc. wasn't observable (skills not trained). |
| **P4.5 — Routine-Week Mode** | **YELLOW with structural §4 RED** | UI ships clean: WeeklyCalendar, Plan Your Week, 5-half-day budget, locked-activity messaging, multi-week cadence (Week 1 Day 3 morning, Week 2 Day 7 afternoon). Commit flow works end-to-end ("Committing…" → resolves → daily mode). 14 activities live (vs Phase 4 spec's 6 — content has expanded). **BUT:** routine commits silently consume pool slots that the just-shipped period-friction content wants. Beat 2B was dropped, Beats 2A/C/D/E/F/G all delayed. Routine activity *deposits* (Knowledge / skill XP / money) are invisible. Interruption system (gate threshold / calendar beat / NPC patience) wasn't observed firing. The shell ships GREEN; the integration with everything else ships RED. |
| **T-1776329282001 (period-friction content)** | **YELLOW with one RED, one CONTENT-MIGRATION** | Content quality is excellent (period detail, NPC voicing, friction mechanics land). Beat 2A/C/D/E/F all fire correctly under collision pressure (delayed but present). **Beat 2B DROPPED entirely** under routine commit + roommate-track winning slot. Beat 2G's `expires_after_days=0` doesn't actually expire (engine slid forward 1 day) — semantic mismatch with spec, but content survives. |
| **Reflection (end-of-arc)** | **BLACK** | Pre-walk grep yielded zero matches for any reflection-engine code. Walk halted at Day 9 before Day-14 reflection could fire, but the grep is dispositive. `/season-recap` exists as a stats dashboard, not the Bible §8 second-person past-tense portrait. **The system that consumes accumulating identity-axis + NPC-relational state has no destination.** This is the most important §3 finding in the audit. |

---

## 6. Recommended next sprint

**Pick:** *"Reflection layer is missing and end-of-Arc-One has nothing — file design ticket before anything else."*

The audit confirms the system *runs*. Engines fire, content renders, period detail lands, friction beats produce stateLog instrumentation. **What the audit also confirms is that the run produces nothing the player can see at the end.** Identity-axis vectors accumulate invisibly; reflection engine is unbuilt; `/season-recap` is stats not portrait. Bible §8 is the payoff for everything else, and the payoff is BLACK.

There's a real risk of going wide on visibility fixes (money band, vectors sidebar, knowledge counter, stress overlay) and shipping a polished mid-arc that lands flat at arc-end because there's no reflection.

**Rank order:**
1. **Reflection-engine spec + ship** (this sprint). Write the design ticket; pick a generator approach (template-based is fine for v1; Claude-API generation is the v2 pull); render at Day-14-evening trigger. Without this, none of the other §2 fixes matter as much because the player's accumulated state has no destination.
2. **Money-as-band rewrite.** Replace `Cash on Hand: 0` numeric meter with band label. ~1 day. Bible §3.1.3 violation is highest-priority §3 fix because it actively miseducates the player.
3. **Vectors sidebar surfacing.** Even a single-line "Your direction is leaning toward [pattern]" rendered after, say, 5 identity-tagged choices would be a massive improvement over "still forming." ~2 days.
4. **Friction-beat slot guarantee.** Either extend `expires_after_days` on all friction beats to ≥3, OR give friction beats priority over routine-eligible activities, OR surface "you missed [Beat 2B]" via a journal-entry on day-rollover. ~3 days, content + engine.
5. **All other §2 polish** (build SHA badge, tab title, stress overlay, energy-delta toast post-mini-game) — defer to a polish sprint after reflection lands.

Do not ship the playtest in current state — the structural collision (§4.1) means external testers will hit a fragile content schedule and never know. **Reflection first, then ship.**

---

## 7. Tickets to file

| Title | Priority | Scope (1 line) |
|---|---|---|
| **Reflection engine — design + ship for Day-14-evening** | P0 | Spec `computeReflection(state) → portrait`, build `/reflection` route or end-of-Day-14 storylet wrap, render second-person past-tense portrait per Bible §8 |
| **Money: replace `Cash on Hand` numeric meter with band label in Arc One** | P0 | ProgressPanel.tsx — render "Tight | Okay | Comfortable" instead of integer; gate by arc index so later arcs can show numbers |
| **Vectors sidebar — show emerging identity pattern instead of "No vectors yet"** | P0 | ProgressPanel.tsx:272 — read `daily_states.lifePressureState`, render single-line dominant-axis text after threshold |
| **Friction-beat slot collision with routine commits** | P0 | Pick: extend all friction-beat `expires_after_days` to ≥3, OR raise pool priority above routine, OR surface miss-notification on day-rollover |
| **`expires_after_days=0` engine semantic doesn't match spec** | P1 | Engine treats `=0` as `<=1` (lenient); decide canonical semantic; fix code or update content to use 1 |
| **Beat 2B Day 9 evening dropped under common play patterns** | P1 | Investigate why scott_cereal won the slot vs lounge_cards_night; consider raising 2B priority or moving day-window |
| **"Trays Again" four duplicate `"What?"` micro-choice buttons** | P1 | UI bug — speakers should be attributed, not rendered identically |
| **Knowledge counter never increments despite academic content** | P1 | Audit Knowledge-deposit sites; confirm routine activities + classroom storylets hit the counter |
| **Stress accumulator unexplained on day-rollover** | P2 | Add "How you slept" microcopy on night→morning transition surfacing the stress delta |
| **Caps mini-game energy delta mismatch (-5 displayed, -3 actual)** | P2 | Decide canonical: bonus for win or display the post-game-modified delta |
| **Build SHA badge missing from header** | P2 | Render `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` short hash in header for tester visibility |
| **Tab title "Move My Value" — fix to "Many More Versions"** | P2 | Update root metadata `title` |
| **Routine activity deposits invisible to player** | P2 | Add deposit toast OR sidebar pulse OR daily-summary card |
| **Glenn directive count: spec (4) vs shipped (1) reconciliation** | P2 | Decide canonical; update CLAUDE.md or ship 3 more directive scenes |
| **GAP-ANALYSIS.md regen — 30-day drift since 2026-04-17** | P2 | Re-run live DB inventory query; update slot matrix; reconcile against shipped Days 2-3 content + period-friction beats |
| **Phase 4 HANDOFF spec stale: `day_index >= 7` vs live `ROUTINE_MODE_START_DAY = 3`** | P3 | Fix HANDOFF; if 3 is intentional, update Phase 4 docs to match |
| **Day 2 evening silent skip (gap not backfilled by 2026-04-20 patch)** | P3 | Add a Day 2 evening pool storylet OR explicit "your evening was uneventful" messaging |
| **Marketing site `/` has no link to `/welcome`** | P3 | Add CTA to landing page |
| **First `/welcome` navigation occasionally renders blank** | P3 | Investigate hydration; add Sentry rule; reload fixes — 1/2 reproduce in audit |
| **`/api/run/reset` returns 401 to player account** | P3 | Either fix auth requirement or rename to admin-only; update HANDOFF |
| **Audit-tool: Chrome MCP `save_to_disk`, console/network capture unreliable on this domain** | P3 | File upstream against Chrome MCP; document workaround in CLAUDE.md / SOP.md |
| **Daily-cadence wall blocks single-session arc walks** | P3 | Add `?dev=1` admin advance affordance for tester accounts so reflection / Day-14 surfaces are reachable in single-session audits |

---

## Appendix A — Per-day notes index

- [Day 0 prework](docs/audit-2026-05-06/00-prework-notes.md) — env, SHA inference, screenshot trade-off, build-SHA workaround
- [Day 1 (= game day 1)](docs/audit-2026-05-06/day-1/notes.md) — room_214 chain, dorm_hallmates, Glenn, lunch_floor, evening_choice, Caps WIN
- [Day 2](docs/audit-2026-05-06/day-2/notes.md) — orientation_fair, terminal_first_visit, Day 2 evening silent skip
- [Day 3](docs/audit-2026-05-06/day-3/notes.md) — **WeeklyCalendar surfaces, routine commit, Beat 2A NOT firing on Day 3 morning** (delayed)
- [Day 4](docs/audit-2026-05-06/day-4/notes.md) — Beat 2A fires (delayed), Beat 2D fires (delayed), money_reality_check NOT firing on Day 4 evening
- [Day 5](docs/audit-2026-05-06/day-5/notes.md) — Beat 2C fires (delayed), Beat 2E fires (delayed), money_reality_check fires (delayed)
- [Day 6](docs/audit-2026-05-06/day-6/notes.md) — Glenn beat 2; Beat 2G NOT firing on Day 6 evening (CANARY)
- [Day 7](docs/audit-2026-05-06/day-7/notes.md) — Week 2 commit; Beat 2G fires on Day 7 (delayed despite expires_after_days=0); Beat 2F NOT firing
- [Day 8](docs/audit-2026-05-06/day-8/notes.md) — heller_lecture NOT firing; job_board (library shift); Beat 2F fires (delayed); pay_phone_line
- [Day 9](docs/audit-2026-05-06/day-9/notes.md) — heller_lecture fires (delayed); P2.4 hide-when-not-met confirmed; Beat 2B MISSED entirely; daily-cadence wall

## Appendix B — stateLog surfaces observed across walk

`session-restore`, `daily-state-mutation`, `micro-choice`, `track-resolve`. All entries carry `sha: "16b36d5"` (matches HEAD).

Specific event types confirmed:
- `sessionRestore.identityStance`
- `sessionRestore.hydrate`
- `dailyStates.lifePressureState`
- `microChoice.start` / `microChoice.complete`
- `microChoice.lifePressure`
- `resolveTerminalChoice.clientStart` / `resolveTerminalChoice.clientComplete`
- `terminalResolve.optimisticDayState`
- `trackStoryletChoice.relationships`
- `choiceLog.periodStance`

By Day 9 Night, ~150+ stateLog entries accumulated. Phase 1 instrumentation is GREEN.
