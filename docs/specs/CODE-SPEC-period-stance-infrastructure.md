<!-- /docs/specs/CODE-SPEC-period-stance-infrastructure.md -->

# Code Spec: `period_stance` Infrastructure + Player Identity Selection

> **Branch:** Create `feature/period-stance-infrastructure` off `main`. All work for this spec lives on this branch. Do not merge until content briefs land and we wire the first beats.
>
> **Parallel work note:** Content briefs for the 10 friction beats are being authored in claude.ai while you build this. The infrastructure should land first so beats can be wired to a working system. No content depends on this spec being merged — only on it being implemented and tested on the branch.
>
> **Companion docs:**
> - `docs/PERIOD-FRICTION-CONTENT-MAP.md` (existing) — design rationale and stance model
> - `docs/specs/CODE-SPEC-period-stance-infrastructure.md` (this file)
> - Forthcoming: `docs/briefs/period-friction-beat-*.md` (10 build briefs)

---

## 1. Scope

This spec covers three pieces of infrastructure that are prerequisites for the period friction content build:

1. **Player Identity Selection** — character creation step where player picks demographic identity. Modifies how friction beats land.
2. **`period_stance` identity tag tracking** — parallel-but-new system for tracking the player's accumulated response pattern across friction micro-choices.
3. **Conditional `events_emitted` based on walk flags** — verify or extend existing terminal-choice infrastructure so relationship events differ by which friction micro-choice was taken upstream.

Out of scope for this spec (do not build yet):
- Reflection engine queries against `period_stance` (Milestone E)
- Arc Two payoff content (AIDS, women's leadership crystallizers)
- Jordan crystallizer logic (deferred)

---

## 2. Player Identity Selection

### 2.1 What it does

At character creation, the player selects identity attributes. These are stored on the player record and queryable by content (storylet requirements, conditional nodes, conditional event emissions). They modify how friction beats land — not by changing whether a beat fires, but by changing the prose, the available micro-choices, and the social cost.

### 2.2 Attributes to capture

| Attribute | Values | Default |
|-----------|--------|---------|
| `race` | `white` \| `black` \| `asian` \| `latino` \| `south_asian` \| `mena` \| `multiracial` \| `other` \| `unspecified` | `unspecified` |
| `gender` | `man` \| `woman` \| `nonbinary` \| `unspecified` | `unspecified` |
| `sexuality` | `straight` \| `gay` \| `bi` \| `questioning` \| `unspecified` | `unspecified` |

**Design notes:**
- `unspecified` is a real choice, not a skipped one. Players who pick it will see beats written from a default-perspective angle (the perspective that 1983 dorm culture treats as default — typically white, male, straight). This matches the existing default and is a valid play experience.
- We are deliberately *not* capturing class background, religion, ability, or international status in this first pass. Add them in a later spec when content demands them.
- Sexuality includes `questioning` because in 1983, for most queer people, "knowing" was not yet a stable category — and the player's time-traveler awareness creates a natural ambiguity space.

### 2.3 Schema

Add columns to the player/character record (likely the `players` table or whatever holds the active character — confirm the exact table name in current schema):

```sql
ALTER TABLE players
  ADD COLUMN identity_race TEXT DEFAULT 'unspecified',
  ADD COLUMN identity_gender TEXT DEFAULT 'unspecified',
  ADD COLUMN identity_sexuality TEXT DEFAULT 'unspecified';
```

Constrain values via CHECK constraints or a lookup table — your call based on existing patterns in the schema. Lookup table is more extensible.

### 2.4 UI

A new character creation step. Sequencing:

1. Existing creation flow (whatever currently exists)
2. **NEW: Identity selection screen** — three dropdowns or radio groups, one per attribute. Each defaults to `unspecified`. A short framing paragraph: *"This is fall 1983. Some details about who you are will shape how the world sees you and how you experience it. You can leave anything unspecified — the game will treat that as the default 1983 dorm experience."*
3. Continue to game.

No edit-after-creation for this first pass. Locked at character creation.

### 2.5 Querying from content

Storylets and conversational nodes need to be able to read these values for:
- `requires_identity` conditions on nodes/choices (e.g., a node that only appears if `identity_sexuality IN ('gay', 'questioning')`)
- `prose_variant` keys on nodes (the same node has different body text by identity — see Section 4 below)

Propose a helper function `playerHasIdentity(attribute, value_or_array)` exposed to the storylet engine. Specifics of how this maps to existing `requires_flag` infrastructure is your call — could be a parallel system or an extension of flags.

---

## 3. `period_stance` Identity Tag Tracking

### 3.1 What it does

`period_stance` is a new identity-tracking dimension parallel to the existing axes (risk/safety, people/achievement, confront/avoid). It tracks the player's accumulated response pattern to period friction beats. Three values can be deposited:

- `challenged` — player visibly pushed back on the norm
- `deflected` — player redirected without confrontation
- `absorbed` — player let the moment pass

The player never sees a counter. The pattern is queried by NPC reactions, gated content, and (later, in Milestone E) the reflection engine.

### 3.2 Storage

Two valid approaches — pick whichever fits existing identity-axis infrastructure better:

**Option A: Extend `choice_log`**
- Add a `period_stance_tag` column to the existing choice log (or wherever identity axis tags are written today).
- When a friction micro-choice fires, write the relevant tag value.
- Querying = aggregation over the log.

**Option B: Dedicated counter table**
- New table `player_period_stance` with columns: `player_id`, `challenged_count`, `deflected_count`, `absorbed_count`.
- Updated on each friction micro-choice via the same event-emission pathway as relationship deposits.
- Querying = direct read.

**Recommendation:** Option A if the existing identity axes are stored in `choice_log` (matches the pattern, simpler to extend). Option B if existing axes use dedicated counters (consistency wins). Use whichever matches `confront_count` / `avoid_count` etc. today.

### 3.3 Writing the tag

Friction micro-choices live as nodes inside conversational storylets. Each micro-choice option carries a `period_stance` field:

```yaml
# Example node fragment
node:
  id: "hallway_friction_2A"
  speaker: "keith"
  body: "Yeah, but that scene where he cries? That was so gay."
  micro_choices:
    - label: "Say nothing. It's not worth it."
      period_stance: "absorbed"
      sets_walk_flag: "hallway_absorbed"
      next_node: "scene_continues"
    - label: "Make a face. Change the subject."
      period_stance: "deflected"
      sets_walk_flag: "hallway_deflected"
      next_node: "scene_continues"
    - label: "\"That word's kind of...\" — trail off."
      period_stance: "challenged"
      sets_walk_flag: "hallway_challenged"
      next_node: "scene_continues"
```

The schema may already support `identity_tags` on micro-choices — if so, `period_stance` may just be a new tag value within that system. Confirm and reuse.

### 3.4 Querying the tag

Need three query patterns:

1. **Threshold check** (for gated content): `periodStanceCount(player, 'challenged') >= 2`
2. **Dominant pattern** (for Milestone E reflection — spec only, not built now): returns the highest-count value among the three.
3. **Most recent value** (for prose variation in subsequent friction beats — see Section 4.2)

Expose as helper functions to the storylet engine.

### 3.5 Pattern persistence

`period_stance` tags persist for the entire arc. They do not decay. They carry across arcs (Arc Two consequences depend on Arc One pattern).

---

## 4. Conditional Prose and Choices

### 4.1 Conditional `events_emitted` on terminal choices

This may already be supported. Verify, and if not, extend.

The pattern:
- A friction micro-choice early in a storylet sets a walk flag (`hallway_challenged`, etc.)
- The storylet's terminal choice fires different `events_emitted` depending on that walk flag

Example terminal choice with conditional emissions:

```yaml
terminal_choice:
  label: "Head to the dining hall."
  events_emitted:
    - condition: "walk_flag == 'hallway_absorbed'"
      events: []  # no relational change
    - condition: "walk_flag == 'hallway_deflected'"
      events:
        - npc: "doug"
          type: "AWKWARD_MOMENT"
          magnitude: 0.5
    - condition: "walk_flag == 'hallway_challenged'"
      events:
        - npc: "keith"
          type: "TRUST_DELTA"
          magnitude: -0.5
        - npc: "doug"
          type: "RELIABILITY_DELTA"
          magnitude: -0.5
        - npc: "mike"
          type: "TRUST_DELTA"
          magnitude: 0.5
          condition: "mike_present"
```

### 4.2 Prose variants by walk flag and identity

Some friction beats — particularly the second instance of a recurring beat type (e.g., Beat 2B reads differently if Beat 2A was `challenged`) — need conditional prose.

Two mechanisms needed:

**Walk-flag-keyed body variants on a node:**
```yaml
node:
  id: "petersons_joke_2B"
  speaker: "peterson"
  body_variants:
    - condition: "prior_period_stance == 'challenged'"
      body: "Peterson tells a joke. Same kind of joke as Keith's last week. You feel the room turn toward you slightly before he's even finished — they've already learned."
    - condition: "prior_period_stance == 'absorbed'"
      body: "Peterson tells a joke. The kind that's becoming familiar. You're getting used to it. That's the part that bothers you."
    - default: true
      body: "Peterson tells a joke. The punchline hinges on a stereotype. Three guys laugh."
```

**Identity-keyed body or micro-choice variants:**
```yaml
node:
  id: "priya_intro_2E"
  body_variants:
    - condition: "playerHasIdentity('race', ['south_asian', 'asian', 'black', 'latino', 'mena', 'multiracial'])"
      body: "Someone asks Priya where she's from. She says New Jersey. They ask where her *parents* are from. You've answered this question. You know the rhythm of it before she does."
    - default: true
      body: "Someone asks Priya where she's from. She says New Jersey. They ask where her *parents* are from. She says New Jersey. They laugh like she's being difficult."
```

Identity-keyed choice variants follow the same pattern — add or remove specific micro-choice options based on identity. (For example: a queer player gets an additional micro-choice in the homophobia beats reflecting their personal stake.)

### 4.3 Implementation note

Whether body variants are stored as separate node records (with conditions) or as a `body_variants` array within a single node is your architectural call. Match whatever pattern is most extensible given existing schema.

---

## 5. Testing Hooks

The headless playthrough runner spec (T-1777215600001) needs to be able to:

1. Set player identity values in fixture state (`identity.race = 'south_asian'`)
2. Inspect `period_stance` counts at any point in a script (`assert period_stance.challenged >= 2`)
3. Verify walk flags are set correctly after a friction micro-choice
4. Run the same script with different identity selections to verify prose variants

Add these hooks to the runner spec when you scope it. No new step types should be needed — existing `set_state`, `assert`, and `choose_choice` patterns cover this.

---

## 6. Migration Order

Suggested implementation order on the branch:

1. Add identity columns to `players` table (or equivalent). Migration + schema test.
2. Implement character creation UI step. Manual smoke test that values persist.
3. Add `period_stance` tracking infrastructure (Option A or B from §3.2). Migration + unit tests.
4. Verify or extend conditional `events_emitted` on terminal choices. Unit tests.
5. Verify or extend conditional prose / micro-choices on nodes. Unit tests.
6. Expose helper functions to storylet engine: `playerHasIdentity`, `periodStanceCount`, `getDominantPeriodStance`, `getPriorPeriodStance`.
7. Add testing hooks per §5.

Each step should be independently testable. The branch should not be merged until all six steps pass and at least one friction beat (the first brief delivered) has been wired to it as a working integration test.

---

## 7. Questions / Decisions Owed Back

When you start the branch, document any of these you have to decide:

- Which existing table holds the player record we're modifying?
- Which storage option for `period_stance` matches existing identity axes?
- Does the current `events_emitted` system already support conditions, or does it need extending?
- Does the current node/choice schema support body or label variants, or does it need extending?

Surface these in the branch's first commit message or in `HANDOFF.md` at end of session so claude.ai can adjust briefs if needed.

---

## 8. Acceptance Criteria

Branch is ready for content wiring when:

- [ ] Player identity columns exist and persist through character creation
- [ ] Character creation UI includes identity selection step with three dropdowns/radio groups
- [ ] `period_stance` tag values can be written from a micro-choice and queried by threshold and recency
- [ ] Conditional `events_emitted` work on terminal choices, keyed off walk flags
- [ ] Body and micro-choice variants render correctly based on `playerHasIdentity` and `period_stance` queries
- [ ] Helper functions exposed to storylet engine and documented
- [ ] Headless playthrough runner can set identity, query `period_stance`, and verify walk flags
- [ ] At least one delivered friction beat brief wired and passing as integration test on the branch

Merge to `main` happens after content briefs land, beats are wired, and a playtest pass is taken on Week 1–2 with friction beats live.

<!-- end spec -->
