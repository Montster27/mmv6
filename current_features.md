# Current Features

This document summarizes the current in‑game systems, how they work, and what they are intended to accomplish. It reflects the `new_interaction` branch state as of today.

## 1) Daily Loop (Core Flow)
**What it is:** The player progresses through a repeating daily cycle (setup → allocation → storylets → microtask/social/reflection/fun pulse → complete).

**How it works:**
- The server orchestrator determines the stage based on saved data (allocation present, storylets run, etc.).
- The loop is idempotent: if the day has already been created, it’s reused rather than recreated.

**Intended purpose:** Provide a stable, repeatable structure for time‑loop play and pacing.

## 2) Persistent Day State (Energy/Stress + Resources)
**What it is:** A per‑day state record for each user that persists across days.

**How it works:**
- Stored in `player_day_state` with energy, stress, and core resources.
- A new day is created from the previous day’s baseline (or defaults on day 0).
- End‑of‑day resolution computes next‑day baseline and applies unresolved tension penalties.

**Intended purpose:** Make the day feel continuous and give players consequences that carry forward.

## 3) Time Allocation (Inputs vs. Totals)
**What it is:** Players allocate daily time across Study, Work, Social, Health, and Fun.

**How it works:**
- Allocation inputs are for the current day only.
- A separate “Resources” panel shows cumulative totals across days (stored in `player_day_state` totals).

**Intended purpose:** Separate player planning (today’s allocation) from long‑term growth (totals).

## 4) Allocation Effects on Energy/Stress
**What it is:** Allocation changes energy and stress immediately.

**How it works:**
- A deterministic formula applies deltas to energy/stress.
- Idempotent per allocation: same allocation hash will not re‑apply.

**Intended purpose:** Make daily planning materially affect the player’s current condition.

## 5) Allocation Effects on Resources
**What it is:** Allocations also generate resources.

**How it works:**
- Gains on submit:
  - money += floor(work / 10)
  - study_progress += floor(study / 10)
  - social_capital += floor(social / 10)
  - health += floor(health / 20), clamped 0–100
- Uses pre‑allocation baselines for idempotent recompute when allocation changes.

**Intended purpose:** Make allocations economically relevant and reinforce long‑term investment.

## 6) Posture Modifiers
**What it is:** Daily posture (push/steady/recover/connect) modifies allocation effects.

**How it works:**
- Posture applies multipliers to energy/stress deltas in the allocation formula.

**Intended purpose:** Give players a meaningful daily stance with tradeoffs.

## 7) Skills (Progression + Costs)
**What it is:** A small skill system (focus/memory/networking/grit) with increasing costs.

**How it works:**
- Skill points are awarded after Day 2, with conditions based on energy/stress and posture.
- Costs scale by level; spending is blocked if points are insufficient.
- Skills affect allocation effects (small, bounded modifiers).

**Intended purpose:** Provide a long‑term progression layer with meaningful investment decisions.

## 8) Storylet Checks (Probability System)
**What it is:** Some storylets can resolve via a skill‑/state‑based probability check.

**How it works:**
- A deterministic check uses skills, energy/stress, and posture.
- Chance is clamped and seeded for repeatability.
- A tester‑mode explanation can show the chance and top factors.

**Intended purpose:** Add controlled uncertainty and make stats matter in narrative outcomes.

## 9) Vectors (Directionality)
**What it is:** A set of directional vectors (reflection, focus, ambition, social, stability, curiosity, agency) that summarize player tendencies.

**How it works:**
- Canonical vector keys are defined centrally.
- Vectors are nudged by:
  - arc choice flags
  - allocation composition (dominant categories)
- UI summary displays dominant vector and recent delta.

**Intended purpose:** Provide a subtle “alignment of self” meter that reacts to choices and habits.

## 10) Arcs (Anomaly Threads)
**What it is:** Short narrative investigations (currently anomaly_001).

**How it works:**
- Arc instance tracks step index and status (active/completed).
- Arc step content is loaded from content tables.
- Arc choices can apply:
  - resource costs/rewards
  - vector deltas
  - alignment deltas
- Costs are enforced; unaffordable choices are disabled in the Arc panel.

**Intended purpose:** Provide episodic narrative progression tied to player resources and alignment.

## 11) Alignment + Factions
**What it is:** Hidden alignment scores across four factions.

**How it works:**
- Alignment rows per user/faction.
- Arc choices and initiatives apply small deltas.
- Recent alignment events are attached to the daily run.

**Intended purpose:** Create slow‑burn ideological drift and future unlocks.

## 12) Weekly Directives + Initiative Rotation
**What it is:** A weekly faction directive per cohort, with initiative rotation.

**How it works:**
- Directive templates are deterministic by cohort/week.
- Directive can select which initiative is active.
- Completion applies a one‑time bonus for cohort members.

**Intended purpose:** Add a shared weekly objective that shapes player focus.

## 13) World State + Cohort Rivalry
**What it is:** Weekly aggregated influence scores globally and per cohort.

**How it works:**
- World and cohort influence computed from alignment events.
- A rivalry snapshot shows top cohorts.
- Used as a light bias for directive selection.

**Intended purpose:** Make the world feel reactive over weeks without heavy PvP.

## 14) Tester UX Layer
**What it is:** A clean separation between in‑world messages and tester guidance.

**How it works:**
- `TesterOnly` wrapper hides tester messages in production.
- `MessageCard` styles tester vs game messaging.
- One‑time tester intro appears in tester mode only.

**Intended purpose:** Provide instructions and diagnostics without leaking into the game experience.

## 15) Arc 1 Content (Anomaly 001)
**What it is:** Seeded arc steps with diegetic narrative choices.

**How it works:**
- Step 0 introduces the anomaly.
- Steps 1–2 add resource tradeoffs and vector movement.

**Intended purpose:** Provide a tangible narrative slice that demonstrates resource tradeoffs and vector drift.

---

If you want this doc trimmed, split by system, or updated for a specific release build, say the word.
