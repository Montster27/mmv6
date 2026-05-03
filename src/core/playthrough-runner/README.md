# Playthrough Runner — Step Type Reference

Headless test harness for the MMV engine. Scripts live in
`scripts/playthroughs/*.yaml`; goldens live in `traces/`. Run via
`npm run playthrough <path>`, `npm run playthrough:all`, or
`npm run playthrough:trace:check`.

This reference focuses on assertions that surface **render state** — what the
UI would show, not just what the DB stores. The split is deliberate:
automatic trace lines (always on) record state changes as side effects of
`choose` / `choose_node`; explicit `expect_*` steps assert the same state
when a script wants to gate progress on the value.

---

## Step types

### Game progression

| Step | Effect |
|---|---|
| `choose { storylet_key, choice_id }` | Resolve a terminal choice. Mirrors `/api/tracks/resolve`. |
| `choose_node { node_id, micro_choice_id }` | Walk one micro-choice in a node tree. |
| `advance_segment` | morning → afternoon → evening → night. |
| `sleep` | Advance to next day. |
| `set_identity { race?, gender?, sexuality? }` | Write `characters.identity_*`. |
| `train_skill { skill_id, state }` | Put a `player_skills` row in `trained` / `active` / `queued` without wall-clock waiting. |

### State assertions

| Step | Reads from |
|---|---|
| `expect_storylet_available { storylet_key, at?, served_by? }` | `selectTrackStorylets` output. |
| `expect_storylet_not_available { storylet_key }` | Same. |
| `expect_resource { name, op, value }` | `getResourceSnapshot`. |
| `expect_walk_flag { flag, present }` | In-memory walkState.flags. |
| `expect_period_stance { tag, op, value }` | `daily_states.period_stance_state[tag]`. |
| `expect_prior_period_stance { value }` | Most recent `choice_log` PERIOD_STANCE row. |
| `expect_reaction_text { variant, contains? }` | `lastChoiceEffects` from the prior `choose`. |
| `expect_identity_axis { axis, op, value }` | `daily_states.life_pressure_state[axis]`. |
| `expect_practice_credit { skill_id, credit_seconds? }` | Most recent `skill_practice_events` row. |
| `expect_active_skill_progress { skill_id, state?, remaining_seconds? }` | `player_skills` row + computed `completes_at - now`. |
| `expect_flag_set { flag, present? }` | `choice_log` FLAG_SET row. |

---

## Automatic trace lines on `choose`

Every `choose` step records a trace entry. When the choice carries any of
the following, additional fields appear in `observed` automatically — the
script does not need to assert them for the line to show up:

| Choice field | Trace fields added |
|---|---|
| `skill_modifier` | `skill_modifier: { skill_id, effect, matched, variant }` |
| `reaction_text` (no modifier) | `reaction_variant: "default"` |
| `identity_tags` | `identity_tags`, `identity_axes_bumped` |
| `practices_skills` | `practiced_skills`, `practice_credits: [{ skill_id, credit_seconds }]` |
| `sets_flag` | `sets_flag` |

`variant` is one of `default` / `skill_modified` / `neither`, matching what
the engine's `dailyLoop.ts:processChoicesForSkills` would surface to the
client when the storylet is served.

---

## How to write a regression test for skill-modifier resolution

The smoke template — `scripts/playthroughs/skill_modifier_smoke.yaml` —
trains `musical_ear`, walks Day 0 morning to Glenn's afternoon beat, and
asserts the choice resolves to the `skill_modified` variant. Pattern:

```yaml
- type: train_skill
  skill_id: musical_ear
  state: trained

- type: expect_active_skill_progress
  skill_id: musical_ear
  state: trained

# … walk to the storylet …

- type: choose
  storylet_key: glenn_pastime_paradise
  choice_id: head_to_evening

- type: expect_reaction_text
  variant: skill_modified
  contains: "harmonic progression"

- type: expect_identity_axis
  axis: risk
  op: eq
  value: 1

- type: expect_flag_set
  flag: glenn_gave_direction
```

`expect_reaction_text` reads the resolved variant from the harness's
`lastChoiceEffects`, set by the prior `choose`. It mirrors the engine's
serve-time annotation in `dailyLoop.ts`, so a regression in that resolver
fails this assertion. The bug surface immediately downstream (UI render of
the modified text) is **not** exercised by the headless harness — that
remains the job of browser playtest.
