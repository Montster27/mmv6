<!-- docs/CONVERSATIONAL_NODES_BRIEF.md -->
# Conversational Nodes — Code Brief

> **For:** Claude Code
> **Status:** Schema designed (origin: 2026-03-30 Dispatch analysis session). Ready to build.
> **Branch:** new branch off `main` after `time_skill` merge, suggested `conv_nodes`
> **Depends on:** `time_skill` merged (Phase 1/2/4 all passed playtest)
> **Unblocks:** Week 2 content build (L1–L5 landmarks), future scene richness

---

## What this is

A second rendering mode for storylets: instead of `body` + terminal `choices`, a storylet can walk the player through a short dialogue tree (2–4 micro-choice points) before reaching the terminal choices. Micro-choices are cheap (no time/energy cost, no preclusion) and shape what's felt and what terminal options are visible. Terminal choices remain expensive and life-shaping.

Flat storylets continue to work unchanged. Nodes are additive and opt-in per storylet via a single nullable column.

---

## Why now

Week 2 content (Tuesday Commitment, The Post, Scott's thing) wants dialogue density that flat `body` + 3 choices can't carry. Writing Week 2 without nodes means either shipping flat and rewriting, or embedding dialogue-as-narration in ways that flatten what the scene wants to do. Landing nodes first lets L1–L5 be written correctly the first time.

---

## Schema

### 1. DB migration

One column. Nullable. Existing storylets unaffected.

```sql
ALTER TABLE public.storylets
  ADD COLUMN nodes jsonb DEFAULT NULL;
```

Engine falls back to flat rendering when `nodes IS NULL`.

### 2. Node shape (stored in the `nodes` jsonb column as an array)

```typescript
type StoryletNode = {
  id: string;                  // unique within this storylet
  text: string;                // 1–4 sentences max
  speaker?: string;            // NPC id, "narrator", or omitted (default narrator)

  // Either micro_choices OR next — not both.
  micro_choices?: MicroChoice[];
  next?: string;               // target node id, "choices", or "exit"
};

type MicroChoice = {
  id: string;                  // unique within this node
  label: string;               // 3–8 words; quoted text for dialogue
  next: string;                // target node id, "choices", or "exit"

  // ── Light effects (all optional) ──
  sets_flag?: string;          // flag local to this storylet walk
  set_npc_memory?: Record<string, Record<string, boolean>>;
  relational_effect?: Record<string, Record<string, number>>;
  identity_tags?: string[];    // use sparingly — usually none

  // ── Explicitly forbidden on micro-choices ──
  // NO time_cost, NO energy_cost, NO costs/rewards, NO precludes,
  // NO next_key, NO targetStoryletId, NO outcomes.
};
```

### 3. Terminal choice additions

Extend existing `StoryletChoice` type with two optional fields:

```typescript
type StoryletChoice = {
  // ... all existing fields unchanged ...
  requires_flag?: string;      // show only if flag set during node walk
  excludes_flag?: string;      // hide if flag set during node walk
};
```

Flags are walk-local — they do not persist after the storylet resolves.

---

## Engine behavior

### Rendering flow

```
1. If storylet.nodes IS NULL → render as today (body + choices). No change.

2. Else:
   a. Show storylet.body as preamble (1–3 sentences, optional).
   b. Start at nodes[0].
   c. Render node: show text (formatted per speaker if set).
   d. If node has micro_choices → show as inline options.
      On selection:
        - apply sets_flag to walk-local flag set
        - apply set_npc_memory / relational_effect to persistent state
        - apply identity_tags to reflection counters
        - navigate to micro_choice.next
   e. If node has next (no micro_choices) → show "continue" → node.next.
   f. Repeat until next == "choices" or "exit".

3. When next == "choices":
   a. Filter terminal choices: hide if requires_flag not in walk flags,
      hide if excludes_flag is in walk flags.
   b. Render remaining terminal choices as today.

4. When next == "exit":
   a. Storylet ends. Apply any default outcome. Resolve normally.
```

### Where to wire it

- **Rendering:** `src/components/play/StoryletCard.tsx` (or wherever body + choices render). Add a sibling `ConversationalWalk` component that takes `nodes[]` and calls out with `walkFlags` + `npcMemoryDeltas` + `identityTagDeltas` when it reaches terminal choices or exit.
- **Choice filtering:** existing choice filter (already handles `requires_skill`) gets two more predicates: `requires_flag` and `excludes_flag` checked against walk flags.
- **Effect application:** `applyOutcome.ts` is fine as-is for terminal choices. Node walk effects apply **incrementally** as the player walks, not deferred to terminal resolution — NPC memory and relational deltas commit on each micro-choice selection.
- **Exit path:** if a node walk ends in `"exit"` with no terminal choice, treat as a default resolve (no resource deltas, walk effects persist).

### Invariants

- Node walk emits no `choice_log` rows. Only terminal choices log.
- Node walk cannot write `next_key_override` or `sets_track_state`. Terminal choices retain sole authority over track progression.
- Walk flags are in-memory only. They do not hit the DB.
- `playthrough_log` records the terminal choice as today. The walk path is NOT logged in Milestone A; add in a later pass if needed for playtest debugging.

---

## Playthrough runner extension

Add a new step type to the discriminated union in `src/core/playthrough-runner/types.ts`:

```typescript
type ChooseNodeStep = {
  type: "choose_node";
  node_id: string;             // current node id, for assertion
  micro_choice_id: string;     // which micro-choice to pick
};
```

Harness method `chooseNode(nodeId, microChoiceId)` walks the node tree inside an in-memory walk state and applies effects the same way the engine would. When a terminal `choices` target is reached, the script switches back to `choose` steps as today.

Update `harness.ts` to track walk state: current node id, walk flags, pending npc_memory/relational deltas. On the first `choose` step after a node walk, flush the deltas to DB, clear walk state.

Add one canonical script: `scripts/playthroughs/node_walk_smoke.yaml` — walks a simple node tree and asserts (a) a flag-gated terminal choice is visible only when the right flag was set, and (b) npc_memory persisted through the walk.

---

## Constraints for content authors

| Rule | Limit | Why |
|------|-------|-----|
| Sentences per node | 4 max | Player should never scroll within a node |
| Micro-choices per node | 2–4 | More = decision paralysis |
| Depth before terminal | 2–4 micro-choice points | Deeper = storylet doing too much; split it |
| Total node word budget | 200–350 words | Same total as the flat body it replaces |
| NPC memory writes per walk | 2 max | Don't overload scenes with persistent state |
| Identity tags on micros | 0–1, usually 0 | Tags are for reflection; most conv moves aren't identity-defining |
| Time/energy cost on micros | NEVER | That's what terminal choices are for |
| Preclusion on micros | NEVER | Micros shape tone, not life direction |

These constraints belong in `docs/CONTENT-RULES.md` as a new rule after the chain/pool rules. Add them as part of this PR.

---

## Migration strategy

1. Ship the schema + engine + runner extension with zero content using it.
2. Retrofit one existing storylet (suggested: `lunch_floor` — has NPC presence, clear micro-choice texture, small scope) as the end-to-end smoke test.
3. Verify in playthrough runner + browser.
4. Only then write Week 2 content using nodes.

---

## Out of scope (explicitly)

- No voice acting / audio. `speaker` is a formatting hint only.
- No inventory / item management in micro-choices.
- No mini-games inside node walks. Mini-games remain on terminal choices only.
- No nested node trees (nodes calling other storylets). Target storylet jumps live on terminal choices.
- No persistent walk-flag storage. Flags are strictly walk-local.

---

## Deliverables

1. Migration: `supabase/migrations/XXXX_storylets_add_nodes.sql`
2. Type updates: `src/types/storylets.ts` — `StoryletNode`, `MicroChoice`, extend `StoryletChoice`
3. Engine hooks: node walk renderer, walk-flag-aware choice filter, incremental effect applier
4. Runner: `choose_node` step type + harness walk state + `node_walk_smoke.yaml` script
5. Docs: new rule in `docs/CONTENT-RULES.md`; update `docs/ENGINE-SPEC.md` to stop saying requirements aren't read (already stale) and add node walk section
6. Retrofit: `lunch_floor` converted to use nodes as the smoke test
7. Vitest: runner integration test covers the smoke-test script

---

## Verification checklist

Before marking done:

- [ ] `nodes IS NULL` storylets render exactly as before (no regression)
- [ ] Retrofitted `lunch_floor` plays in browser with micro-choices inline
- [ ] Walk flags correctly gate a terminal choice in retrofitted storylet
- [ ] NPC memory committed mid-walk persists after storylet resolves
- [ ] `choose_node` step works in playthrough runner
- [ ] All existing playthrough scripts still pass (no regression)
- [ ] CONTENT-RULES.md updated with node rules
- [ ] ENGINE-SPEC.md node walk section added
- [ ] One line added to `docs/DECISIONS.md` naming this change + date

---

## Speaker formatting (locked)

When a node has `speaker: "npc_roommate_scott"`, render the text as italicized quoted dialogue with a subtle attribution line beneath:

```
*"What are you reading?"*
— Scott
```

Attribution uses the NPC's display name from the registry (same resolver as `getDisplayBody()`). Attribution line is smaller and in a muted tone color (CSS: one size down, lower opacity or secondary text color). Narrator speaker (or no speaker) renders as regular prose with no attribution — same as today's body text.

This styling favors a literary, novelistic feel over a script format. It's the right fit for MMV's prose standard (Mistry as reference). If a scene ever needs clearer multi-speaker turn-taking and this format gets confusing, flag it in playtest rather than overriding the default per-storylet.
