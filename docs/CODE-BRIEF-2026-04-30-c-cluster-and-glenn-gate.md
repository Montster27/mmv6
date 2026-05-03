# Code session brief — sprint c3d4e content + UI cluster

## What ships in this session

Three tickets bundled, plus a critical bug found while scoping them.

1. **T-1777320000010** — Sharpen Glenn's directive in `glenn_pastime_paradise` (with **critical gate-flag fix**, see §1)
2. **T-1777320000011** — Add secondary world-pointer to terminal (§2)
3. **T-1777310000001** — NPC name color-coding for full Arc One cast (§3)

Plus commit the doc-only T-1777300000004 changes already in the working tree (§0).

## §0 — First: commit the CONTENT-RULES update

`docs/CONTENT-RULES.md` has uncommitted changes from claude.ai (Rules 12, 13, 14 plus anti-pattern entries). T-1777300000004 closed in Kanban. Land as standalone commit before anything else.

```
docs(content-rules): add Rule 12 (navigateTo), Rule 13
(ConditionalEmissionGroup), Rule 14 (text_variants on
prior_period_stance)

Documents three engine features that shipped between
2026-04-22 and 2026-04-27 without doc coverage. Closes
T-1777300000004. Unblocks T-1776329282001 (period friction
build, sprint_d4e5f) — friction beat authors now have a
documented reference for the engine surfaces they'll be
using 5-9 more times.

No code changes. Doc-only.
```

Verify `tsc --noEmit` clean and `vitest run` parity before moving on.

---

## §1 — T-1777320000010: Critical gate-flag fix + directive sharpen

**While scoping this ticket, claude.ai found a critical content bug.**

Read `supabase/migrations/20260403100000_glenn_terminal_opportunity_storylets.sql`. Three storylets in sequence:

1. `glenn_pastime_paradise` (Day 0 PM) — Glenn delivers directive to find the terminal
2. `terminal_first_visit` (Day 1+ PM) — gated by `requires_flag: glenn_gave_direction`
3. `glenn_the_walk` (Day 5+ AM) — gated by `requires_flag: found_terminal`

**`glenn_gave_direction` is set NOWHERE in the migration.** The single terminal choice on `glenn_pastime_paradise` (`head_to_evening`) does NOT set it. No micro-choice sets it. No subsequent migration adds it.

**This means `terminal_first_visit` is currently unreachable.** Two consecutive playtesters (external 2026-04-27, monty 2026-04-28) failed to reach the terminal not because of discoverability — because of a missing flag write.

Verify before fixing:

```bash
grep -rn "glenn_gave_direction" supabase/
grep -rn "glenn_gave_direction" src/
```

If both come back empty (which is what claude.ai expects), proceed with the fix.

### The fix has two parts

**Part A: Set the flag.** Add `sets_flag: glenn_gave_direction` to the `head_to_evening` terminal choice on `glenn_pastime_paradise`. The flag is set on any path *except* `walked_away` — meaning if the player engaged with Glenn at all (called_it_out, asked_origin), the terminal becomes reachable.

But the way the storylet is structured today, all paths converge at `head_to_evening`. So either:

- (a) Set `glenn_gave_direction` unconditionally on `head_to_evening`. Simple. Means even the `walked_away` path opens the terminal — which is OK, because `walked_away` describes the player not stopping with Glenn; they still saw him, still heard the recognition. The directive arguably *did* reach them, just incompletely. Defensible.

- (b) Use `requires_flag` / `excludes_flag` on multiple terminal choices to gate by walk path. More structurally correct; more migration work.

**Recommend (a) for this fix.** It restores the broken path with minimum surface area. If we later want to give `walked_away` players a different downstream experience, that's a separate ticket.

**Part B: Sharpen the directive.** The directive content is already concrete (Glenn says "computer lab in the basement of Whitmore. CS department runs it. Tell whoever's at the desk you're looking at the network project"). The playtester complaint isn't that the prose is vague — it's that the directive is buried inside conditional micro-choice branches that not every player walks through, AND the player has no way to act on it immediately.

Three improvements to ship together:

1. **Always-visible directive.** The `glenn_direction` node currently only fires after `called_it_out` or `asked_origin` micro-choices. The `walked_away` path skips it entirely. Add a brief diegetic version of the directive that surfaces even on `walked_away` — Glenn calling after the player as they leave, or the player overhearing the directive in their head as déjà vu. Keep it short (2-3 sentences). The player doesn't engage but the seed is planted.

2. **Sharper landing on the directive node itself.** Glenn's three-line directive is good but plain. Add one sentence at the end that ties the directive to recognition feeling, not just instruction. Example:

   > He pulls the guitar strap over his shoulder. "Tell whoever's at the desk you're looking at the network project. Get yourself a login. Read what's there." A pause. "It'll feel like recognition. That's the point."

   The "feel like recognition" line connects the terminal to Glenn's original hook (the song the player recognized) — same texture, different surface.

3. **Stronger terminal choice label.** Currently `head_to_evening` is just "Head toward the evening." Change to something that carries the directive forward: "Head toward the evening — and Whitmore basement, whenever that fits."

Don't over-edit Glenn's voice. Surgical changes only.

### Acceptance for §1

- [ ] `grep` confirmed `glenn_gave_direction` is set nowhere before the fix
- [ ] Migration file (new, dated 20260430xxxxxx) UPDATEs `glenn_pastime_paradise` to set the flag on `head_to_evening` plus the prose changes above
- [ ] `terminal_first_visit` becomes reachable in playtest after the fix
- [ ] Playthrough script `scripts/playthroughs/glenn_to_terminal.yaml` exists and asserts: walk through `glenn_pastime_paradise`, resolve `head_to_evening`, verify `terminal_first_visit` is served on Day 1 afternoon
- [ ] Browser-spot-check: fresh user, walk to Glenn, take any path, advance to Day 1, see terminal storylet appear

---

## §2 — T-1777320000011: Secondary world-pointer

Belt-and-suspenders for terminal discoverability. Even with §1's fix, a player who doesn't engage past Glenn's first beat may not register the directive. Need one additional in-world signal that the terminal exists.

**Three options in the original ticket (A: flyer, B: NPC mention, C: ambient location reference). Pick whichever fits best given the existing content surface. Recommend Option B — NPC mention** — because it doesn't require a new storylet host (B can attach to an existing Day 1 belonging beat) and feels more textured than a static flyer.

**Suggested implementation (NPC mention):**

Find a Day 1 or Day 2 belonging-track storylet where Doug, Keith, or Mike is present in casual conversation. Add 1-2 sentences of throwaway dialogue mentioning the lab. Examples (pick what fits the host storylet's tone):

> Doug: "Bryce was up in the CS lab last night. Said the printer ate his econ paper. Whitmore basement, if you ever need to print anything."

> Keith (passing by Whitmore): "My cousin works in there. Says the place smells like a hardware store after rain."

The pointer is **diegetic, not directive**. The player who heard Glenn perks up at it. The player who didn't hears it as random dorm chatter.

**If `npc_contact_glenn.found_terminal` is true** (player has visited the lab already), the variant text should slightly shift — Doug saying something the player can now interpret with new context. Use `text_variants` keyed on `npc_memory: npc_contact_glenn.found_terminal`. See CONTENT-RULES Rule 14.

### Picking the host storylet

Read a few candidate Day 1-2 belonging storylets (`first_morning`, `lunch_floor`, `dorm_hallmates`, etc.) and pick the one where the dialogue insertion feels most natural — i.e., where the floor guys are already chatting and 1-2 sentences of Whitmore mention won't break the scene's rhythm. Don't force it into a storylet that doesn't have room.

If no good fit exists, file a follow-up ticket for a small new "hallway chatter" storylet rather than retrofit poorly. Better to have nothing than to have something forced.

### Acceptance for §2

- [ ] Host storylet identified and named in commit message
- [ ] 1-2 sentence world-pointer added (or the alternate text_variant if Glenn-aware)
- [ ] Voice consistent with the speaker NPC's existing register
- [ ] Browser-spot-check: storylet plays normally, the pointer lands as background texture not as a directive
- [ ] If a follow-up ticket was filed (no good fit existed): ticket created in Kanban with the chosen direction noted

---

## §3 — T-1777310000001: NPC name color-coding for Arc One

Playtest feedback (2026-04-27): tracking 11+ NPCs across storylets is hard. Visual identity per NPC would help.

The ticket specifies hex assignments for the Arc One cast. Read the ticket for the canonical list:
`~/Projects/MMV/_assets/MMV_Docs/Kanban data/tickets/T-1777310000001.md`

This is mostly UI work, with a small DB component:

### Implementation outline

1. **DB:** Add a `display_color` column to the `npcs` table (or whatever the NPC registry table is called — verify in schema). Hex string, nullable.
2. **Migration:** Populate the column for all 11 Arc One NPCs per the ticket's hex list. Plus a default fallback color for unregistered NPCs.
3. **UI:** Where NPC names render (speaker labels in `DialogueNodeView`, NPC memory panels, relationship displays, journal entries), wrap the name in a span with `style={{ color: npc.display_color ?? defaultColor }}`. Use existing NPC-data fetching path; don't create new ones.
4. **Accessibility:** Confirm the chosen colors meet WCAG AA contrast against the background. If any don't, surface to monty and we adjust the hex.
5. **Test data update:** If any tests assert on rendered NPC name HTML, update them to expect the new color attribute.

### Where the rendering touches

The likely render points (verify in code, don't trust this list):

- `src/components/play/DialogueNodeView.tsx` — speaker labels above quoted dialogue
- Any NPC reference component (search `npc_id` rendering)
- Relationship/memory panels if they exist as separate components
- Journal entries that reference NPCs

If the same NPC reference appears in 5+ places, consider extracting a small `<NpcName npcId={...} />` component and using it everywhere. Reduces drift.

### Acceptance for §3

- [ ] Migration adds `display_color` column to NPC registry table
- [ ] All 11 Arc One NPCs from T-1777310000001 have colors set
- [ ] Default fallback color exists for any future unregistered NPC
- [ ] NPC names render with their assigned color in: dialogue speaker labels, NPC memory panel, journal entries (or whichever subset of these surfaces apply)
- [ ] WCAG AA contrast confirmed against the relevant backgrounds
- [ ] `tsc --noEmit` clean, `vitest run` parity, `playthrough:all` parity
- [ ] Browser-spot-check: pick a storylet that surfaces 3+ different NPCs, verify each renders in their own color

---

## Commit strategy

Recommend three commits in this order:

1. **§0** — `docs(content-rules):` doc-only commit (already in working tree)
2. **§1 + §2** — `fix(content): repair glenn_gave_direction gate, sharpen directive prose, add world-pointer` — single content commit, since they're conceptually one piece (terminal discoverability) and use the same migration file pattern
3. **§3** — `feat(ui): NPC color-coding for Arc One cast` — separate because it's UI + schema work, distinct from content

Three commits is fine for a session. Don't bundle into one.

---

## Verification end-of-session

- [ ] Three commits on `feature/period-stance-infrastructure`
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` parity (246 passed / 1 skipped)
- [ ] `playthrough:all` parity (13/7), plus the new `glenn_to_terminal.yaml` script passing
- [ ] Branch pushed; new Vercel preview deployment URL surfaced to monty
- [ ] All three Kanban tickets moved to col_done with completion notes
- [ ] HANDOFF.md updated per the `feedback_handoff_refresh` discipline

---

## Out of scope for this session

- T-1777310000003 (reputation prose hooks) — separate ticket, separate session
- T-1777320000012 (campus map UI affordance) — design spike, claude.ai-driven
- Any Glenn or terminal redesign beyond the surgical fixes above
- Any T-1777400000001 follow-up (state corruption) — that's gated on Sentry capturing the next occurrence
- Step 7/8 cleanup — still deferred

---

## Important note on §1's gate-flag bug

This is the kind of finding that retroactively explains earlier playtest issues. Two playtesters in two days "missed the terminal" — they didn't miss it, they were locked out of it. That's a meaningful difference for understanding the rest of the playtest data.

If you find similar "gate flag set nowhere" bugs while implementing §1 or §2 (i.e., you read other migrations and notice another `requires_flag` whose setter doesn't exist), file them as separate tickets immediately. Don't fix them in this commit — same scope discipline as the Phase 1 instrumentation. But surface them so we have a tracked list rather than a "remember to look at this someday" note.

The §1 bug suggests a broader pattern worth checking: are there other gate flags that go unset because their writers were assumed but never implemented? A grep audit for `requires_flag` against `sets_flag` could surface the answer in 30 seconds. Worth doing as a follow-up ticket if not in this session.

---

## Begin with §0.
