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
