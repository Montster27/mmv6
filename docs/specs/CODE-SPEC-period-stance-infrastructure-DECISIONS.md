<!-- /docs/specs/CODE-SPEC-period-stance-infrastructure-DECISIONS.md -->

# Period Stance Infrastructure — Schema Discovery Decisions

> Companion to `CODE-SPEC-period-stance-infrastructure.md`. Answers the four
> open questions in §7 of that spec based on repo exploration on
> 2026-04-24. Briefs in claude.ai can adjust forthcoming friction-beat briefs
> accordingly.
>
> **Branch:** `feature/period-stance-infrastructure` off `main`.

---

## Q1 — Which table holds the player/character record?

**Answer: `public.characters`.**

- **Definition:** [supabase/migrations/0001_phase1_schema.sql:22-28](supabase/migrations/0001_phase1_schema.sql)
  ```sql
  create table if not exists public.characters (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users (id) on delete cascade,
      name text,
      created_at timestamptz not null default now()
  );
  create index if not exists characters_user_id_idx on public.characters (user_id);
  ```
- **Creation path:** `ensurePlayerSetup()` at [src/lib/bootstrap.ts:36-51](src/lib/bootstrap.ts) — inserts a character row with `name: null` on first login (retry-aware).
- **Constraint note:** there is **no unique index on `user_id`** — the code-level pattern is "one character per user", enforced by the `limit(1).maybeSingle()` read + insert idiom rather than a DB constraint.
- **Who reads it:** today only `bootstrap.ts` reads/writes. No downstream engine code queries `characters` for per-player identity — meaning identity columns are net-new readers, not modifications to an existing query surface.

**Implementation implication**
- Identity columns go on `characters`. Add `identity_race`, `identity_gender`, `identity_sexuality` text columns with `DEFAULT 'unspecified'` and CHECK constraints for the allowed value sets.
- Character creation writes defaults on first login (preserved behaviour for legacy users). UI step, when implemented, updates the row.

---

## Q2 — Which storage option for `period_stance` matches existing identity axes?

**Answer: Neither spec option (A or B) fits cleanly. Use a third path that mirrors the existing life-pressure pattern — a JSONB column on `daily_states`.**

### How existing identity axes are stored today

The spec asks whether we have `confront_count` / `avoid_count` etc. — we don't, exactly. What exists is:

- A JSONB column `daily_states.life_pressure_state` added by [supabase/migrations/0096_arc_one_scarcity.sql:2](supabase/migrations/0096_arc_one_scarcity.sql).
- Typed as `LifePressureState` at [src/core/chapter/types.ts:1-8](src/core/chapter/types.ts):
  ```ts
  export type LifePressureState = {
    risk: number; safety: number;
    people: number; achievement: number;
    confront: number; avoid: number;
  };
  ```
- Written by `bumpLifePressure()` at [src/core/chapter/state.ts:168-180](src/core/chapter/state.ts), persisted via `updateLifePressureState()` at [src/lib/play.ts:759-768](src/lib/play.ts).
- Called from two sites in [src/app/(player)/play/page.tsx](src/app/(player)/play/page.tsx) — one for micro-choice `identity_tags` (line 1715) and one for terminal-choice `identity_tags` (line 2146).
- The mapping from choice tag strings (`"risk"`, `"avoid"`, `"confront"`, etc.) to axis keys is in [src/core/chapter/mapping.ts](src/core/chapter/mapping.ts).

### Why neither spec option fits

- **Option A (extend `choice_log`)** — `choice_log` is an event log with fixed columns (`event_type`, `track_id`, `option_key`, `meta jsonb`). Identity-axis counts today are *derived from a counter column*, not aggregated from the log. Adding a column here diverges from the pattern.
- **Option B (dedicated counter table)** — close in spirit, but we already have a counter surface (`life_pressure_state`) that the engine + reflection code reads cleanly. Adding a parallel table doubles the write/read paths.

### Decision: add `period_stance_state jsonb` to `daily_states`

This mirrors life_pressure_state exactly:

```sql
ALTER TABLE public.daily_states
  ADD COLUMN IF NOT EXISTS period_stance_state jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Shape:
```ts
type PeriodStanceState = {
  challenged: number;
  deflected: number;
  absorbed: number;
};
```

- A new `bumpPeriodStance(current, tag)` helper in `src/core/chapter/state.ts`.
- A new `updatePeriodStanceState()` writer alongside `updateLifePressureState` in `src/lib/play.ts`.
- Micro-choices get a `period_stance: 'challenged' | 'deflected' | 'absorbed'` field (parallel to `identity_tags`). When a friction micro-choice is selected, the existing `onMicroEffects` callback picks it up and bumps the counter.
- Query helpers:
  - `periodStanceCount(state, tag)` — threshold check
  - `getDominantPeriodStance(state)` — reflection query (returns highest count, or `null` on tie/empty)
  - `getPriorPeriodStance(state)` — for prose variants; returns the most recent non-zero tag — but "most recent" can't be derived from a counter. **This is a gap.**

### The "most recent" gap and how we cover it

`periodStanceCount` and `getDominantPeriodStance` are trivial over a counter. But `getPriorPeriodStance` (spec §3.4 item 3 — "most recent value for prose variation") cannot be reconstructed from pure counts.

**Solution:** also write each period_stance tag to `choice_log` with a new `event_type='PERIOD_STANCE'` event, parallel to the existing `FLAG_SET` event pattern (see [src/app/api/tracks/resolve/route.ts:432-446](src/app/api/tracks/resolve/route.ts)). This gives:
- Counter reads (fast): from `daily_states.period_stance_state`
- Temporal reads (ordered): from `choice_log` with `event_type='PERIOD_STANCE' AND user_id=X ORDER BY created_at DESC`
- Arc Two persistence: both the counter and the log survive arc rollover since neither is cleared by routine ticks or season reset (per post-2026-04-23 invariants)

This ends up being a *hybrid* of A and B:
- **Log for temporal queries** (A-flavoured) — `choice_log` gets a new event_type value
- **Counter for threshold/dominant queries** (B-flavoured) — `daily_states` gets a new JSONB column matching `life_pressure_state`

Written once per micro-choice (both writes) so the two sources never drift.

---

## Q3 — Does the current `events_emitted` system support conditions?

**Answer: No. It is a flat array that always fires. Extension is needed.**

### Current shape

[src/types/storylets.ts:99-103](src/types/storylets.ts):
```ts
events_emitted?: Array<{
  npc_id: string;
  type: string;
  magnitude?: number;
}>;
```

Consumed unconditionally at:
- [src/app/(player)/play/page.tsx:2080](src/app/(player)/play/page.tsx) — flat-body storylet resolve
- [src/app/(player)/play/page.tsx:2475](src/app/(player)/play/page.tsx) — track-storylet beat resolve

In both spots, `option.events_emitted ?? []` is spread into `relationshipEvents`, which is passed to `applyRelationshipEvents` in [src/lib/relationships.ts](src/lib/relationships.ts). Every entry fires; no predicate.

### What walk-flag gating already covers

Choices already have `requires_flag` / `excludes_flag` (lines 137-139). That means you can today write *two entire terminal choices* gated by different walk flags, each with its own `events_emitted` list. That's the pattern used by the 2026-04-22 `tuesday_commitment` rewrite ([supabase/migrations/20260422100000_tuesday_commitment_flag_persistence.sql](supabase/migrations/20260422100000_tuesday_commitment_flag_persistence.sql)).

For friction beats, this works — but it 3x's the terminal-choice count when you have 3 stance values. Conditional `events_emitted` keeps the terminal choice count to one while varying the social fallout.

### Extension decision

Extend the `events_emitted` field to accept either the existing flat array OR a conditional-group array, via a discriminated type:

```ts
type EventEmission = {
  npc_id: string;
  type: string;
  magnitude?: number;
};

type ConditionalEmissionGroup = {
  /** Walk-flag predicate. One of:
   *  - flag: single walk-flag that must be set
   *  - all_flags: every walk-flag in the list must be set
   *  - else: fires only if no earlier group matched
   */
  condition: { flag?: string; all_flags?: string[]; else?: true };
  events: EventEmission[];
};

events_emitted?: EventEmission[] | ConditionalEmissionGroup[];
```

Runtime detection at call sites is a simple shape check: if the first element has a `condition` key, treat the array as grouped; otherwise treat as flat (backward-compat).

**Flag access:** the two call sites in `play/page.tsx` need access to `activeFlags` from `DialogueNodeView` at the moment of choice resolution. Today the view tracks flags internally and does not expose them to `onChoice`. Extension: change the `onChoice` callback signature to also receive the active flag set, or pipe it via `onMicroEffects` (which is already wired but only for micro-choices).

Simpler pattern: `onChoice(choiceId, { activeFlags: Set<string> })`. Applied at `DialogueNodeView.tsx:243`, plumbed to `handleChoice` in `page.tsx`, and used at the two `events_emitted` spread sites.

### Evaluation order

Groups are evaluated top-to-bottom. First match wins unless the group has `condition.else` in which case it fires only if no previous group matched. This mirrors Phase 2's `condition.else_next` pattern on DialogueNode (line 188-190 of storylets.ts).

---

## Q4 — Does the current node/choice schema support body or label variants?

**Answer: No. Only a single `text` per node and `label` per micro-choice. Conditional gating + routing exists; variant rendering does not.**

### What exists today

At [src/types/storylets.ts:169-191](src/types/storylets.ts):
```ts
export type DialogueNode = {
  id: string;
  text: string;           // single string, no variants
  speaker?: string;
  condition?: {
    flag?: string;
    all_flags?: string[];
    npc_memory?: string;   // added 2026-04-17
  };
  micro_choices?: MicroChoice[];
  next?: string;
  else_next?: string;      // added 2026-04-22 Part 4
};
```

The conditional-gating surface is 80% of what the spec asks for — `condition.flag`, `condition.all_flags`, and `condition.npc_memory` are all implemented in `evaluateNodeCondition` at [src/components/play/DialogueNodeView.tsx:21-42](src/components/play/DialogueNodeView.tsx) and honored during auto-advance at line 138.

### What's missing

- `body_variants` on DialogueNode (spec §4.2)
- `label_variants` on MicroChoice (spec §4.2)
- Identity predicate support in node/choice conditions (spec §4.2 — `playerHasIdentity(...)`)
- Prior-stance predicate support (spec §4.2 — `prior_period_stance == 'challenged'`)

### Extension decision

Add parallel variant fields with the same condition shape as node-level conditions, plus two new predicate kinds (`identity` and `period_stance`):

```ts
type NodeCondition = {
  flag?: string;
  all_flags?: string[];
  npc_memory?: string;
  // NEW
  identity?: { attribute: "race" | "gender" | "sexuality"; in: string[] };
  period_stance?: { tag: "challenged" | "deflected" | "absorbed"; min?: number };
  prior_period_stance?: "challenged" | "deflected" | "absorbed";
};

type DialogueNode = {
  // ...existing fields
  text: string;                    // fallback, used when no variant matches
  text_variants?: Array<{ condition: NodeCondition; text: string }>;
};

type MicroChoice = {
  // ...existing fields
  label: string;                   // fallback
  label_variants?: Array<{ condition: NodeCondition; label: string }>;
  // NEW field for period_stance tracking
  period_stance?: "challenged" | "deflected" | "absorbed";
};
```

Evaluator picks the **first matching variant**; falls back to `text` / `label` if none match. This is the simplest model (matches how `else_next` already works) and avoids multi-variant ambiguity.

### Which reads need the evaluator

- `NodeText` at [src/components/play/DialogueNodeView.tsx:63-92](src/components/play/DialogueNodeView.tsx) — resolve variant before rendering `node.text`.
- Micro-choice render loop at line 211 — resolve label variant before rendering `micro.label`.
- `evaluateNodeCondition` (line 21) needs to accept player identity and period_stance state alongside flags + relationships. Signature extension: add a 3rd arg `playerContext: { identity: PlayerIdentity; periodStance: PeriodStanceState; priorPeriodStance?: string }`.

### Why variants, not more conditional nodes

The existing "create a new node and route via `else_next`" pattern works for branchy prose, but scales poorly for friction beats where each of 3 stance outcomes needs its own body text of each of 10 beats (30 node rows) plus identity variants (up to 6× that). Variants keep related prose in one row and make authorial intent legible.

---

## Summary for brief authors

| Spec item | Mechanism |
|-----------|-----------|
| Player identity attributes | Three text columns on `characters`: `identity_race`, `identity_gender`, `identity_sexuality`. Default `'unspecified'`. Set at character creation, not editable after. |
| `period_stance` per-micro-choice | New `period_stance` field on MicroChoice: `'challenged' \| 'deflected' \| 'absorbed'`. Bumps a counter AND writes a `PERIOD_STANCE` event to `choice_log`. |
| Threshold query | `periodStanceCount(state, tag) >= N` against `daily_states.period_stance_state`. |
| Most-recent query | `getPriorPeriodStance(userId)` reads latest `choice_log` row with `event_type='PERIOD_STANCE'`. |
| Identity predicate | `condition.identity: { attribute, in: [...] }` on nodes and variants. |
| Body/label variants | `text_variants: [{ condition, text }, ...]` and `label_variants: [{ condition, label }, ...]`. First match wins; fallback to default. |
| Conditional events_emitted | Terminal choices can use grouped form `[{ condition: { flag }, events: [...] }, { condition: { else: true }, events: [...] }]`. Flat array form still works. |

**What briefs should specify:**
- Body variants as `text_variants`, keyed by `condition.flag` (walk flag set by an upstream micro-choice in the same scene), `condition.prior_period_stance` (carries across scenes), or `condition.identity`.
- Micro-choices with a `period_stance` field on each option.
- Terminal choices can use `events_emitted` in conditional group form when different stances should cost different NPCs differently.
- Content briefs do **not** need to specify the `period_stance_state` column, `PERIOD_STANCE` event type, or helper function internals — those are engine-layer. Briefs just write `period_stance: "challenged"` on each option and let the engine aggregate.

<!-- end decisions -->
