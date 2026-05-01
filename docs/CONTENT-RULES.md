# Content Placement Rules
> The one and only authority for how storylets are placed in the engine.
> Every migration must follow these rules. No exceptions.

---

## Rule 1: Two modes. Pick one per storylet. Never mix.

**CHAIN MODE:** The storylet is served because a prior storylet's `next_key` or `default_next_key` explicitly names it. Use chain mode when scenes MUST play in a fixed sequence (hallmates → lunch → evening).

**POOL MODE:** The storylet is served because it matches the current day, segment, and requirements. No storylet points to it. Use pool mode when scenes are independent or gated by prior choices (morning-after variants, optional encounters).

**The rule:** A storylet is either chained OR pooled. Never both. If a `default_next_key` or any choice `next_key` points to a storylet, that storylet is in chain mode — the pool will never reach it because the override takes priority. If you want the pool to serve a storylet, nothing can chain to it.

---

## Rule 2: Chain sequences use `next_key`. The last link has NO `default_next_key`.

A chain is a strict sequence on a single track:

```
storylet_A
  choice_1 → next_key: "storylet_B"
  choice_2 → next_key: "storylet_B"
  (all choices point to the same next, or default_next_key handles it)

storylet_B
  default_next_key: "storylet_C"

storylet_C
  default_next_key: NULL  ← END OF CHAIN. Pool takes over from here.
```

**The last storylet in any chain MUST have `default_next_key: NULL` and NO choice-level `next_key` values.** This clears the override and lets the pool scan find the next content. If you set a `default_next_key` on the last link, it becomes an override and the pool is bypassed.

**When a chain ends with NULL:** The resolve route checks for future unresolved content on the track. If any exists → track stays ACTIVE and pool scan serves the next eligible storylet. If none exists → track COMPLETED.

---

## Rule 3: One track per storylet. No cross-track references.

Every storylet belongs to exactly one track. The engine only looks up `next_key` within the same `track_id`. A `next_key` or `default_next_key` pointing to a storylet on a different track will:
- Fail silently
- Set a broken pointer on `track_progress`
- Kill the track

**Never do this:**
```
storylet on ROOMMATE track
  default_next_key: "dorm_hallmates"  ← this is on BELONGING track → BROKEN
```

**If you need two tracks to advance at the same time:** They advance independently. Put a storylet on each track with the same `due_offset_days`. The engine serves up to 2 at a time across all tracks.

---

## Rule 4: `due_offset_days` controls WHEN. Segment controls WHICH SLOT.

```
due_offset_days = 0  → available from started_day (Day 0 = arrival)
due_offset_days = 1  → available from started_day + 1 (Day 1)
due_offset_days = 2  → available from started_day + 2 (Day 2)
```

`due_offset_days` is relative to `started_day`, NOT the current day. A storylet with `due_offset_days: 1` is always due on Day 1, regardless of when the player resolves Day 0 content.

**Segment** controls which part of the day:
- `segment: "morning"` → only surfaces during morning
- `segment: "afternoon"` → only surfaces during afternoon
- `segment: "evening"` → only surfaces during evening
- `segment: null` → surfaces in ANY segment (use sparingly — this competes with everything)

**The scheduling formula:**
```
WHEN does it appear?  → due_offset_days
WHICH SLOT?           → segment
HOW LONG is it available? → expires_after_days (generous: 7 for orientation)
```

---

## Rule 5: Max 2 storylets shown at once. Segment is your scheduling tool.

The engine returns at most 2 storylets across ALL tracks, sorted by soonest expiry. If 3 tracks all have morning content due, only 2 appear.

**To avoid collisions:** Put storylets in different segments. Design the day so each segment has at most 2 tracks with content due:

```
Day 1:
  Morning:   roommate (first_morning) + belonging (morning_after_*)  → 2 slots, full
  Afternoon: academic (advisor_visit)                                → 1 slot, fine
  Evening:   belonging (evening activity)                            → 1 slot, fine
```

**If you MUST have 3+ tracks in one segment:** The player sees the 2 most urgent. The third appears after one of the first two is resolved (next page load). This works but feels like a queue, not a natural day. Prefer segment separation.

---

## Rule 6: `requires_choice` gates pooled content. It checks `choice_log.option_key`.

A pooled storylet with `requirements: { requires_choice: "go_to_party" }` only surfaces if the player previously picked a choice with `id: "go_to_party"` on the SAME track.

**Critical:** `requires_choice` is track-scoped. A choice made on the belonging track can only gate other belonging storylets. It cannot gate roommate or academic storylets.

**The option_key must match the choice ID exactly.** Check the source storylet's JSON:
```json
{ "id": "go_to_party", "label": "Head to Anderson Hall with Doug" }
```
The `requires_choice` value is `"go_to_party"` — the `id` field, not the label.

---

## Rule 7: `order_index` only matters for the FIRST storylet on a track.

`buildInitialTrackProgress()` finds the storylet with the lowest `order_index` on each track and sets it as the starting point. After that, `order_index` is NEVER read again.

**For chain mode:** Sequencing is controlled by `next_key`, not `order_index`.
**For pool mode:** Sequencing is controlled by `due_offset_days` and `segment`, not `order_index`.

Set `order_index` correctly on the first storylet of each track. For all other storylets, `order_index` can be any value — it's ignored. Don't use it to imply sequencing. It doesn't.

---

## Rule 8: `expires_after_days` must be generous for orientation content.

```
expires_after_days = 0  → only available on its due day
expires_after_days = 7  → available for 8 days (due day + 7)
```

If a player is slow and doesn't resolve Day 0 content until Day 2, a Day 1 storylet with `expires_after_days: 0` will have expired before they reach it. The storylet never surfaces and the content is lost.

**For all orientation content (Days 0-3):** Set `expires_after_days: 7`. Tight windows are for time-pressure content during active weeks, not onboarding.

**When a storylet expires unresolved:** It stays in the pool but fails the due-window check. If it's the only content on the track and it expires, the track may complete. Use generous windows to prevent this.

---

## Rule 9: Tags are metadata only. The engine does not read them.

`game_entry`, `arc_one`, `day1`, `onboarding` — these are for human reference and Content Studio display. The engine does NOT use tags for selection, gating, or sequencing.

**Do not rely on tags for engine behavior.** If you need a storylet to be the game entry point, ensure it's the lowest `order_index` on its track. If you need it gated, use `requires_choice`. Tags are labels, not instructions.

---

## Rule 10: Checklist for every new storylet migration.

Before writing any storylet migration, answer:

```
□ Is this CHAIN or POOL mode?
  CHAIN: What storylet's next_key points to this? Is it on the same track?
  POOL:  Does NOTHING point to this via next_key or default_next_key?

□ What track is this on?
  Confirm track_id matches. No cross-track references in any next_key.

□ What day does this appear?
  Set due_offset_days correctly (0 = arrival, 1 = first full day, etc.)

□ What segment?
  Set segment to morning/afternoon/evening. Avoid null unless intentional.

□ Will it collide with other tracks in this segment?
  Check: how many other tracks have content due on this day + segment?
  If 3+, move this to a different segment.

□ Does it have requirements?
  If gated by prior choice: set requires_choice with the exact choice ID.
  Confirm the source choice is on the SAME track.

□ What chains forward from this?
  If chain mode: set next_key or default_next_key to the next storylet.
  If pool mode: set default_next_key to NULL. Confirm no choice has next_key.
  If LAST in a chain before pool content: default_next_key MUST be NULL.

□ What's expires_after_days?
  Orientation: 7. Active weeks with time pressure: 1-3.

□ Is the previous chain endpoint correct?
  If this is the first pool storylet after a chain: confirm the chain's
  last storylet has default_next_key: NULL (not pointing to this storylet).
```

---

## Example: Day 0-1 Correct Wiring

```
ROOMMATE TRACK:
  room_214 (CHAIN, order=-1, due=0, morning)
    → default_next_key: "first_morning"
  first_morning (CHAIN, due=1, morning)
    → default_next_key: NULL  ← chain ends, pool takes over
  [future Day 2 roommate beat] (POOL, due=2, morning, no requires)
    → appears via pool scan on Day 2

BELONGING TRACK:
  dorm_hallmates (CHAIN, order=1, due=0, morning)
    → choices all next_key: "lunch_floor"
  lunch_floor (CHAIN, due=0, afternoon)
    → default_next_key: "evening_choice"
  evening_choice (CHAIN, due=0, evening)
    → default_next_key: NULL  ← CHAIN ENDS HERE. Pool takes over.
    → choices: go_to_party / go_to_cards / go_to_union (no next_key on any)
  morning_after_party (POOL, due=1, morning, requires_choice: "go_to_party")
  morning_after_cards (POOL, due=1, morning, requires_choice: "go_to_cards")
  morning_after_union (POOL, due=1, morning, requires_choice: "go_to_union")
    → all three: default_next_key: NULL, no choice next_keys
    → pool scan serves whichever matches the player's evening choice

ACADEMIC TRACK:
  admin_errand (CHAIN, order=0, due=0, morning)
    → default_next_key: "advisor_visit"
  advisor_visit (CHAIN, due=1, afternoon)
    → default_next_key: NULL  ← chain ends, pool takes over
  [future Day 2-3 academic beat] (POOL, due=2, afternoon, no requires)
```

---

## Rule 11: Conversational nodes — constraints for content authors.

When a storylet uses `nodes` (a dialogue tree before terminal choices), the following limits apply:

| Constraint | Limit | Why |
|-----------|-------|-----|
| Sentences per node | 4 max | Player should never scroll within a node |
| Micro-choices per node | 2–4 | More = decision paralysis |
| Depth before terminal choices | 2–4 micro-choice points | Deeper = storylet doing too much; split it |
| Total node word budget | 200–350 words | Same total as the flat body it replaces |
| NPC memory writes per walk | 2 max | Don't overload scenes with persistent state |
| Identity tags on micro-choices | 0–1, usually 0 | Tags are for reflection; most conv moves aren't identity-defining |
| Time/energy cost on micro-choices | NEVER | That's what terminal choices are for |
| Preclusion on micro-choices | NEVER | Micro-choices shape tone, not life direction |

**Micro-choices are cheap.** No time cost, no energy cost, no resource costs, no preclusion, no `next_key`, no `sets_track_state`, no outcomes. They set walk-local flags (via `sets_flag`) and optionally deposit NPC memory or relational effects. Terminal choices retain sole authority over track progression and resource changes.

**Walk flags are ephemeral.** They exist only during the node walk and are used to gate terminal choices via `requires_flag` / `excludes_flag`. They do not persist after the storylet resolves.

**Always leave at least one ungated terminal choice.** If all terminal choices have `requires_flag`, the player can be stranded when walk flags don't match. At least one terminal should always be visible.

**Speaker formatting:** When a node has `speaker: "npc_roommate_scott"`, the text renders as italicized quoted dialogue with a small attribution line beneath (NPC display name from registry). No speaker (or `speaker: "narrator"`) renders as regular prose.

---

## Anti-Pattern Summary

| Anti-Pattern | Why It Breaks |
|-------------|---------------|
| `default_next_key` pointing to a pooled storylet | Override bypasses pool; gated content never fires |
| `next_key` pointing cross-track | Silent failure; broken pointer kills the track |
| `segment: null` on multiple tracks same day | All compete for 2 slots; unpredictable suppression |
| `requires_choice` referencing a choice on another track | Gate never opens; choice_log is track-scoped |
| `order_index` used for sequencing after first storylet | Engine ignores it after initialization |
| `expires_after_days: 0` on orientation content | Slow players miss it permanently |
| Chain storylet with `default_next_key: NULL` in the middle of a sequence | Track falls to pool prematurely; rest of chain orphaned |
| Pool storylet that is ALSO a `next_key` target | Override always wins; pool gating is irrelevant |
| Text-only intro node with no `next` set | `navigateTo` treats it as `terminal: "exit"` and the storylet ends prematurely |
| `ConditionalEmissionGroup` without an `else` group | If no flag matches, ZERO events fire; the choice silently has no consequence |
| NPC deposits placed on micro-choices instead of terminal `events_emitted` | Walk flags persist; micro-choice deposits don't — the deposit silently disappears |
| `text_variants` keyed on `period_stance` count for the choice currently being made | The counter writes AFTER this storylet resolves — it reads the prior state, not the in-flight one |
| `prior_period_stance` predicate used as if it tracks the stance just deposited | It reads the most-recent stance from `choice_log` BEFORE this micro-choice; the in-flight tag is invisible until resolve |

---

## Rule 12: Text-only intro and coda nodes are first-class. The harness auto-advances.

The playthrough harness `navigateTo` helper auto-advances through any node that does NOT have `micro_choices`. This means content authors can freely use text-only nodes for scene-setting, transitions, and codas — the player sees a "Continue" button (UI) or auto-skip (harness), and the storylet flows forward without requiring a micro-choice at every node.

**The auto-advance contract:**

When the engine arrives at a node, `navigateTo` evaluates in this order:

1. If the node ID is `"choices"` or `"exit"` — set the walk's terminal state and stop. The terminal choices render.
2. If the node ID doesn't exist in `nodes[]` — fall through to `"choices"`. (Defensive; indicates a content bug worth fixing.)
3. If the node has a `condition` and it fails — recurse on `node.else_next ?? node.next`. The node is skipped.
4. If the node has `micro_choices` — stop. This is a player input point.
5. If the node has neither `micro_choices` nor an unmet condition — recurse on `node.next`. **This is the auto-advance path.**

**Predicate handling in `navigateTo`:**

For `condition` predicates, `navigateTo` evaluates:

- `flag` and `all_flags` — read from walk state directly. Honored normally.
- `npc_memory`, `period_stance`, `prior_period_stance`, `identity` — **treated as met** in the harness. The harness doesn't re-check these; it trusts that `chooseNode` writes the underlying state on each micro-choice. (Real game behavior still gates correctly because the renderer evaluates predicates at render time.)

This means harness playthroughs exercise specific paths regardless of npc/identity state — acceptable for testing structure, but unit tests of identity-gated content need direct predicate-evaluation tests, not just walk traces.

**Recursion cap:**

`navigateTo` caps recursion at 32 hops. Authors who write infinite cycles (node A.next = B, node B.next = A with no choices) will throw at runtime. This is intentional — silent infinite loops would be worse.

**Terminal text nodes:**

A text-only node with `next: "exit"` (or no `next` at all — same effect) treats as the storylet's end. The terminal choices skip rendering; the storylet resolves directly. Use this for codas like `card_taken`, `the_realization` where the scene's last word is narration, not a choice.

**Worked example — intro → choice → coda:**

```yaml
nodes:
  # Intro: text-only, scene-setting, auto-advances
  - id: scan_board
    text: "The job board is a corkboard of index cards. Most are work-study
           positions. A few have phone numbers torn off the bottom in strips."
    next: pick_card

  # Interactive: micro-choices, player picks, sets walk flag
  - id: pick_card
    text: "Which card pulls your attention?"
    micro_choices:
      - id: pick_library
        label: "Library circulation desk — evenings, $4.25/hr"
        sets_flag: has_job_library
        next: card_taken
      - id: pick_dining
        label: "Dining hall — mornings, $3.85/hr + meals"
        sets_flag: has_job_dining
        next: card_taken
      # ... two more options

  # Coda: text-only, terminal text, auto-resolves
  - id: card_taken
    text: "You take the strip with the phone number. The card stays on the board."
    next: choices

choices:
  - id: leave_board_library
    requires_flag: has_job_library
    label: "Head out, library job in mind"
    # ... terminal effects
  - id: leave_board_dining
    requires_flag: has_job_dining
    label: "Head out, dining shift starting tomorrow"
    # ...
```

The player experience: scene description → "Continue" → micro-choice → brief coda → "Continue" → terminal choices. The harness exercises the same path automatically.

---

## Rule 13: `events_emitted` can be conditional. Read the schema before writing fallout.

A terminal choice's `events_emitted` is normally a flat array of `EventEmission` (NPC deposits). When you need different deposits to fire based on which micro-choice was taken upstream, use the `ConditionalEmissionGroup[]` form instead.

**The two shapes:**

```typescript
// Flat (default): all listed events fire when this choice resolves.
events_emitted: EventEmission[]

// Conditional: each group has a flag predicate; first match wins.
events_emitted: ConditionalEmissionGroup[]
//                 ^^^ each: { condition: { flag | all_flags | else }, events: EventEmission[] }
```

The engine detects which shape you've used by looking at the first element. If it has a `condition` field, the array is treated as conditional. Otherwise flat.

**Evaluation order:**

Groups evaluate top-to-bottom against the walk's active flags. **The first non-`else` group whose condition matches fires its events. Evaluation stops there — only one group fires.** If nothing matches, the engine fires every group marked `condition.else: true`.

**The else-fallback is critical.** Without it, a player whose walk flags don't match any specific group gets ZERO events from this choice — the deposit silently disappears.

**Worked example — friction-conditional NPC fallout (Beat 2A pattern):**

Terminal choice `head_to_class_day3` after the hallway-comment friction beat. The micro-choices set walk flags `friction_challenged`, `friction_deflected`, or `friction_absorbed`. Each path produces different NPC fallout:

```yaml
choices:
  - id: head_to_class_day3
    label: "Head to class"
    events_emitted:
      # Path 1: Player challenged Keith's comment
      - condition:
          flag: friction_challenged
        events:
          - npc_id: npc_floor_keith
            type: trust_decrease
            magnitude: 0.5
          - npc_id: npc_floor_doug
            type: reliability_decrease
            magnitude: 0.5
          - npc_id: npc_floor_mike
            type: trust_increase
            magnitude: 1.0

      # Path 2: Player deflected, changed subject
      - condition:
          flag: friction_deflected
        events:
          - npc_id: npc_floor_doug
            type: awkward_moment
            magnitude: 0.5

      # Path 3: Player absorbed (said nothing or laughed along)
      - condition:
          flag: friction_absorbed
        events:
          - npc_id: npc_floor_doug
            type: reliability_increase
            magnitude: 0.5
          - npc_id: npc_floor_keith
            type: trust_increase
            magnitude: 0.5

      # Fallback: walk somehow had no friction flag (defensive)
      - condition:
          else: true
        events: []
```

Note the `else` group at the bottom — even with `events: []`, it acknowledges the no-flag case explicitly. Without it, an author later adding a fourth path might not realize they need to handle the unmatched case.

**`all_flags` for compound conditions:**

When a path requires multiple flags set together:

```yaml
- condition:
    all_flags: [friction_challenged, mike_witnessed]
  events:
    - npc_id: npc_floor_mike
      type: deepens_alliance
      magnitude: 1.5
```

**Anti-pattern: NPC deposits on micro-choices.**

`MicroChoice` supports `set_npc_memory` and `relational_effect`. Use these sparingly — they fire on the micro-choice itself. For most relational fallout, **defer to the terminal's `ConditionalEmissionGroup`**. Reason: walk flags persist into the terminal; micro-choice deposits don't accumulate cleanly when the player makes multiple micro-choices in a single walk.

**Anti-pattern: conditioning on `period_stance` count in the same scene.**

The `period_stance` deposit happens when the micro-choice is selected, but the counter increment writes AFTER the terminal resolves. If you condition `events_emitted` on `period_stance.challenged >= 2`, you're reading the count BEFORE this scene's deposit — not after. Use the walk flag (`friction_challenged`) for "what happened in this scene" and `prior_period_stance` for "what happened in the most recent prior scene."

---

## Rule 14: `text_variants` and `label_variants` let prose acknowledge accumulated state.

Nodes and micro-choices both support conditional text variation. The engine evaluates variants top-to-bottom; **first matching variant wins**, falling back to the default `text` (or `label`) if none match.

**Schema reference:**

```typescript
// On DialogueNode
text: string                                    // fallback
text_variants?: Array<{
  condition: NodeCondition;
  text: string;
}>

// On MicroChoice
label: string                                   // fallback
label_variants?: Array<{
  condition: NodeCondition;
  label: string;
}>
```

**`NodeCondition` predicates available:**

| Predicate | Reads | Use case |
|-----------|-------|----------|
| `flag` | walk-local flag set during this storylet's walk | "This scene's earlier micro-choice" |
| `all_flags` | multiple walk-local flags | Compound walk-local state |
| `npc_memory` | persistent NPC memory key (`npc_id.key`) | "Mike trusts you from prior scenes" |
| `identity` | player's `race`/`gender`/`sexuality` | Identity-shaped variation |
| `period_stance` | cumulative counter on `daily_states.period_stance_state` (with optional `min`) | "Player has challenged 2+ times overall" |
| `prior_period_stance` | most-recent stance value from `choice_log` | "Player challenged in the most recent prior friction beat" |

**Worked example — variants on `prior_period_stance` for repeat encounters:**

Beat 2B (Peterson's joke, lounge scene). The player's reaction to Keith's hallway comment last beat shapes how this scene's prose lands. Same micro-choice options, different framing:

```yaml
nodes:
  - id: peterson_joke
    text: "Peterson tells a joke. The punchline lands on a stereotype. Three guys laugh."
    text_variants:
      # If the player challenged in the prior friction beat,
      # the prose acknowledges they've been here before.
      - condition:
          prior_period_stance: challenged
        text: "Peterson tells a joke. The punchline lands on a stereotype. Three
               guys laugh. You've been here before, two days ago in the hallway.
               You know the shape of what happens next."

      # If the player absorbed last time, the prose reflects what the
      # accumulation feels like from inside.
      - condition:
          prior_period_stance: absorbed
        text: "Peterson tells a joke. You're getting used to it. That's the part
               that bothers you."

    micro_choices:
      - id: speak_up
        label: "\"Come on, Peterson.\""
        # The challenger's label gets sharper after a prior challenge —
        # the player has done this before, the words come more easily.
        label_variants:
          - condition:
              prior_period_stance: challenged
            label: "\"Peterson. Don't.\""
        sets_flag: friction_challenged
        period_stance: challenged
        next: choices
      - id: change_subject
        label: "Ask Doug about the football game on Sunday"
        sets_flag: friction_deflected
        period_stance: deflected
        next: choices
      - id: laugh_along
        label: "Laugh — it wasn't really *that* bad"
        sets_flag: friction_absorbed
        period_stance: absorbed
        next: choices
```

**The accumulation principle.** The second beat reads differently because of the first. Not through branching at the storylet level — through prose variation keyed to a single predicate. Lower content authoring cost; same player-perceptible payoff.

**Precedence: first-match wins.**

Variants array order matters. Most-specific variants go first; broadest fallbacks last. If two variants would both match (e.g., one keyed on `prior_period_stance: challenged`, another on `period_stance.challenged >= 2`), the one listed first fires.

**Anti-pattern: conditioning on the in-flight stance.**

`period_stance` and `prior_period_stance` both read state from BEFORE the current scene resolves. If you write a `text_variant` keyed on `prior_period_stance: challenged` expecting it to reflect the player's challenge in *this* storylet, you'll read whatever the most recent prior scene deposited — not what the player just did. Use walk flags for in-scene reactions; use these predicates for cross-scene memory.

**Editorial note.** Variants are most powerful when subtle. A challenger's label going from `"That word's kind of—"` (trailing-off, inarticulate) to `"Peterson. Don't."` (terse, practiced) is a stronger payoff than three sentences of variant prose. The variant should feel like the same character with a different muscle memory.
