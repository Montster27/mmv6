/**
 * Playthrough Runner — Type Definitions
 *
 * Discriminated union on step.type for the script format.
 * Reserved future types throw "not implemented."
 */

// ---------------------------------------------------------------------------
// Script step types
// ---------------------------------------------------------------------------

export type ExpectStoryletAvailableStep = {
  type: "expect_storylet_available";
  storylet_key: string;
  at?: { day?: number; segment?: string; track?: string };
  served_by?: "pool" | "chain";
};

export type ExpectStoryletNotAvailableStep = {
  type: "expect_storylet_not_available";
  storylet_key: string;
};

export type ExpectResourceStep = {
  type: "expect_resource";
  name: string;
  op: "eq" | "gt" | "gte" | "lt" | "lte";
  value: number;
};

export type ChooseStep = {
  type: "choose";
  storylet_key: string;
  choice_id: string;
};

export type AdvanceSegmentStep = {
  type: "advance_segment";
};

export type SleepStep = {
  type: "sleep";
};

export type ChooseNodeStep = {
  type: "choose_node";
  /** Current node id — asserted for script correctness. */
  node_id: string;
  /** Which micro-choice to pick. */
  micro_choice_id: string;
};

/**
 * Set the player identity attributes on the characters row. Any omitted
 * attribute is left unchanged. Used to drive `condition.identity` predicates
 * in node walks without running the character-creation UI flow.
 */
export type SetIdentityStep = {
  type: "set_identity";
  race?: string;
  gender?: string;
  sexuality?: string;
};

/**
 * Assert the current period_stance counter for a given tag. Reads
 * `daily_states.period_stance_state[tag]` — the same surface the render-time
 * evaluator consults.
 */
export type ExpectPeriodStanceStep = {
  type: "expect_period_stance";
  tag: "challenged" | "deflected" | "absorbed";
  op: "eq" | "gt" | "gte" | "lt" | "lte";
  value: number;
};

/**
 * Assert that a walk-local flag is present (or absent) in the active node walk.
 * Used to verify that a micro-choice's `sets_flag` took effect mid-walk.
 */
export type ExpectWalkFlagStep = {
  type: "expect_walk_flag";
  flag: string;
  present: boolean;
};

/**
 * Assert the most recent PERIOD_STANCE choice_log event for this user. Used
 * to verify that variant prose gated on `prior_period_stance` will select
 * the expected branch on the next beat.
 */
export type ExpectPriorPeriodStanceStep = {
  type: "expect_prior_period_stance";
  value: "challenged" | "deflected" | "absorbed" | null;
};

/**
 * Put a skill in a target state without waiting wall-clock time. Used to set
 * up `requires_skill` / `skill_modifier` paths in regression scripts.
 *
 * - `trained`: status='trained', completes_at=null, trained_at=now.
 * - `active`:  status='active', completes_at=now+base_train_seconds.
 * - `queued`:  status='queued', no timestamps.
 *
 * Upserts so the same skill_id can be re-stated within a script.
 */
export type TrainSkillStep = {
  type: "train_skill";
  skill_id: string;
  state: "trained" | "active" | "queued";
};

/**
 * Assert which reaction-text variant a choice would render in the UI for the
 * player's current trained-skill set. Mirrors the `processChoicesForSkills`
 * annotation in `dailyLoop.ts` so headless tests catch regressions in
 * skill_modifier resolution.
 *
 * Variants:
 *   - `skill_modified`: choice has a matching `skill_modifier` and the player
 *     has the skill trained → `reaction_with_skill` is what the UI shows.
 *   - `default`:        no modifier active → `reaction_text` is what shows.
 *   - `neither`:        the choice has no reaction text in either field.
 *
 * `contains` is an optional substring check on the resolved text.
 */
export type ExpectReactionTextStep = {
  type: "expect_reaction_text";
  variant: "default" | "skill_modified" | "neither";
  contains?: string;
};

/**
 * Assert the value of a `life_pressure_state` axis on `daily_states`. Axes
 * are bumped by terminal-choice `identity_tags` via `bumpLifePressure`.
 */
export type ExpectIdentityAxisStep = {
  type: "expect_identity_axis";
  axis: "risk" | "safety" | "people" | "achievement" | "confront" | "avoid";
  op: "eq" | "gt" | "gte" | "lt" | "lte";
  value: number;
};

/**
 * Assert that the most recent terminal choice triggered a practice-credit
 * deposit on the named skill. Reads from `skill_practice_events` ordered by
 * `applied_at`. `credit_seconds` defaults to 900 (PRACTICE_CREDIT_SECONDS env
 * default) — pass the override here when running with a non-default env.
 */
export type ExpectPracticeCreditStep = {
  type: "expect_practice_credit";
  skill_id: string;
  credit_seconds?: number;
};

/**
 * Assert the queue state of a skill. `state` checks the discrete queue slot;
 * `remaining_seconds` checks `completes_at - now` for an active skill (only
 * meaningful when state='active').
 */
export type ExpectActiveSkillProgressStep = {
  type: "expect_active_skill_progress";
  skill_id: string;
  state?: "trained" | "active" | "queued" | "none";
  remaining_seconds?: {
    op: "eq" | "gt" | "gte" | "lt" | "lte";
    value: number;
  };
};

/**
 * Assert that a persistent FLAG_SET event was logged to `choice_log` for the
 * given flag name. Looks at FLAG_SET rows where `option_key=flag`.
 */
export type ExpectFlagSetStep = {
  type: "expect_flag_set";
  flag: string;
  present?: boolean;
};

export type CommitRoutineStep = { type: "commit_routine"; [key: string]: unknown };
export type AdvanceDayStep = { type: "advance_day"; [key: string]: unknown };

export type ScriptStep =
  | ExpectStoryletAvailableStep
  | ExpectStoryletNotAvailableStep
  | ExpectResourceStep
  | ChooseStep
  | AdvanceSegmentStep
  | SleepStep
  | ChooseNodeStep
  | SetIdentityStep
  | ExpectPeriodStanceStep
  | ExpectWalkFlagStep
  | ExpectPriorPeriodStanceStep
  | TrainSkillStep
  | ExpectReactionTextStep
  | ExpectIdentityAxisStep
  | ExpectPracticeCreditStep
  | ExpectActiveSkillProgressStep
  | ExpectFlagSetStep
  | CommitRoutineStep
  | AdvanceDayStep;

// ---------------------------------------------------------------------------
// Script format (parsed from YAML)
// ---------------------------------------------------------------------------

export type PlaythroughScript = {
  name: string;
  description: string;
  extends?: string; // path to fixture snapshot (relative to scripts/playthroughs/)
  steps: ScriptStep[];
};

// ---------------------------------------------------------------------------
// Failure output
// ---------------------------------------------------------------------------

export type StepFailure = {
  stepIndex: number;
  step: ScriptStep;
  expected: string;
  observed: string;
  context: Record<string, unknown>;
  priorSteps: ScriptStep[];
};

export type ScriptResult = {
  name: string;
  passed: boolean;
  failures: StepFailure[];
  stepsRun: number;
  totalSteps: number;
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Deterministic step trace (for drift detection / golden-file comparison)
// ---------------------------------------------------------------------------

/**
 * One observation per step. Omit any field that's N/A for the step type.
 * Serialized to `scripts/playthroughs/traces/<script_name>.trace.json` and
 * committed to git — unexpected diffs in PR review surface drift.
 *
 * Invariants:
 *   - No wall-clock timestamps, no user_ids, no DB-generated ids.
 *   - Deterministic given identical content + scripted steps.
 */
export type TraceEntry = {
  step_index: number;
  step_type: ScriptStep["type"];
  step_summary: string;
  state_before: {
    day: number;
    segment: string;
    hours_remaining: number;
  };
  observed: Record<string, unknown>;
};

export type ScriptTrace = {
  script_name: string;
  total_steps: number;
  entries: TraceEntry[];
};

// ---------------------------------------------------------------------------
// Fixture snapshot (user state only — no storylet content)
// ---------------------------------------------------------------------------

export type FixtureSnapshot = {
  daily_states: Record<string, unknown>;
  player_day_state: Record<string, unknown>[];
  track_progress: Record<string, unknown>[];
  choice_log: Record<string, unknown>[];
  player_skills: Record<string, unknown>[];
  _meta: {
    script_name: string;
    created_at: string;
    day_index: number;
    segment: string;
  };
};
