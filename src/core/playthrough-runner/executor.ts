/**
 * Playthrough Runner — Script Executor
 *
 * Loads YAML scripts, walks steps, runs assertions, collects failures.
 * Failure output is the most important deliverable.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import * as yaml from "js-yaml";
import { PlaythroughHarness } from "./harness";
import type {
  PlaythroughScript,
  ScriptStep,
  StepFailure,
  ScriptResult,
  FixtureSnapshot,
  TraceEntry,
  ScriptTrace,
} from "./types";

// ---------------------------------------------------------------------------
// Script loading
// ---------------------------------------------------------------------------

export function loadScript(scriptPath: string): PlaythroughScript {
  const absPath = resolve(scriptPath);
  if (!existsSync(absPath)) {
    throw new Error(`Script not found: ${absPath}`);
  }
  const raw = readFileSync(absPath, "utf8");
  const parsed = yaml.load(raw) as PlaythroughScript;
  if (!parsed || !parsed.name || !Array.isArray(parsed.steps)) {
    throw new Error(`Invalid script format in ${absPath}: missing name or steps`);
  }
  return { ...parsed, _sourcePath: absPath } as PlaythroughScript & {
    _sourcePath: string;
  };
}

function loadFixture(
  fixturePath: string,
  scriptDir: string
): FixtureSnapshot {
  const absPath = resolve(scriptDir, fixturePath);
  if (!existsSync(absPath)) {
    throw new Error(`Fixture not found: ${absPath}`);
  }
  return JSON.parse(readFileSync(absPath, "utf8")) as FixtureSnapshot;
}

// ---------------------------------------------------------------------------
// Step formatting (for output)
// ---------------------------------------------------------------------------

function describeStep(step: ScriptStep): string {
  switch (step.type) {
    case "expect_storylet_available":
      return `expect_storylet_available(${step.storylet_key}${step.served_by ? `, served_by=${step.served_by}` : ""})`;
    case "expect_storylet_not_available":
      return `expect_storylet_not_available(${step.storylet_key})`;
    case "expect_resource":
      return `expect_resource(${step.name} ${step.op} ${step.value})`;
    case "choose":
      return `choose(${step.storylet_key}, ${step.choice_id})`;
    case "choose_node":
      return `choose_node(${step.node_id}, ${step.micro_choice_id})`;
    case "advance_segment":
      return "advance_segment";
    case "sleep":
      return "sleep";
    default:
      return `${step.type}(...)`;
  }
}

function formatPriorSteps(steps: ScriptStep[]): string {
  if (steps.length === 0) return "<start>";
  return steps.map(describeStep).join(" → ");
}

// ---------------------------------------------------------------------------
// Comparison operators
// ---------------------------------------------------------------------------

function compareOp(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "gt":
      return actual > expected;
    case "gte":
      return actual >= expected;
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Script execution
// ---------------------------------------------------------------------------

export async function executeScript(
  script: PlaythroughScript,
  options?: { scriptDir?: string; verbose?: boolean; recordTrace?: boolean }
): Promise<ScriptResult & { trace?: ScriptTrace }> {
  const startTime = Date.now();
  const failures: StepFailure[] = [];
  const harness = new PlaythroughHarness();
  const scriptDir = options?.scriptDir ?? resolve("scripts/playthroughs");
  const traceEntries: TraceEntry[] | undefined = options?.recordTrace
    ? []
    : undefined;

  try {
    // Initialize harness (fresh or from fixture)
    if (script.extends) {
      const fixture = loadFixture(script.extends, scriptDir);
      await harness.initFromFixture(fixture);
    } else {
      await harness.init();
    }

    // Walk steps
    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      const priorSteps = script.steps.slice(Math.max(0, i - 3), i);

      // Future step types
      if (
        step.type === "commit_routine" ||
        step.type === "advance_day"
      ) {
        throw new Error(
          `Step type "${step.type}" is reserved but not yet implemented`
        );
      }

      try {
        const failure = await executeStep(
          harness,
          step,
          i,
          priorSteps,
          traceEntries
        );
        if (failure) {
          failures.push(failure);
          if (options?.verbose) {
            process.stderr.write(`  ✗ step ${i + 1}: ${describeStep(step)}\n`);
          }
          // Stop on first failure — later steps depend on prior state
          break;
        }
        if (options?.verbose) {
          process.stderr.write(`  ✓ step ${i + 1}: ${describeStep(step)}\n`);
        }
      } catch (err) {
        failures.push({
          stepIndex: i,
          step,
          expected: `step to execute without error`,
          observed: `error: ${(err as Error).message}`,
          context: {
            day: harness.dayIndex,
            segment: harness.currentSegment,
            error_type: (err as Error).constructor.name,
          },
          priorSteps,
        });
        if (options?.verbose) {
          process.stderr.write(
            `  ✗ step ${i + 1}: ${describeStep(step)} — ERROR: ${(err as Error).message}\n`
          );
        }
        break;
      }
    }

    const result: ScriptResult & { trace?: ScriptTrace } = {
      name: script.name,
      passed: failures.length === 0,
      failures,
      stepsRun: failures.length > 0
        ? (failures[0].stepIndex + 1)
        : script.steps.length,
      totalSteps: script.steps.length,
      durationMs: Date.now() - startTime,
    };

    if (traceEntries) {
      result.trace = {
        script_name: script.name,
        total_steps: script.steps.length,
        entries: traceEntries,
      };
    }

    return result;
  } finally {
    await harness.teardown().catch((err) => {
      console.error(`[runner] teardown failed: ${(err as Error).message}`);
    });
  }
}

/**
 * Execute a single step. Returns a StepFailure if the assertion fails, null if OK.
 * Throws on hard errors (DB failures, missing storylets, etc.).
 *
 * If `trace` is provided, appends a deterministic observation entry on
 * successful steps. Failed steps are recorded via StepFailure instead —
 * a trace represents the successful path only.
 */
async function executeStep(
  harness: PlaythroughHarness,
  step: ScriptStep,
  stepIndex: number,
  priorSteps: ScriptStep[],
  trace?: TraceEntry[]
): Promise<StepFailure | null> {
  // Capture state_before snapshot for trace (deterministic — no wall clock).
  const stateBefore = {
    day: harness.dayIndex,
    segment: harness.currentSegment,
    hours_remaining: harness.hoursRemaining,
  };
  const pushTrace = (observed: Record<string, unknown>): void => {
    if (!trace) return;
    trace.push({
      step_index: stepIndex,
      step_type: step.type,
      step_summary: describeStep(step),
      state_before: stateBefore,
      observed,
    });
  };

  switch (step.type) {
    case "expect_storylet_available": {
      const available = await harness.getAvailableStorylets();
      const match = available.find(
        (d) => d.storylet.storylet_key === step.storylet_key
      );

      if (!match) {
        // Build context: what IS available, track progress state
        const availableKeys = available.map((d) => d.storylet.storylet_key);
        const trackKey = step.at?.track;
        const trackProgress = trackKey
          ? await harness.getTrackProgress(trackKey)
          : null;

        return {
          stepIndex,
          step,
          expected: `storylet_key=${step.storylet_key} available${step.served_by ? `, served_by=${step.served_by}` : ""}`,
          observed: availableKeys.length > 0
            ? `available storylets: [${availableKeys.join(", ")}]`
            : `no storylets available${trackKey ? ` in ${trackKey} track` : ""}`,
          context: {
            day: harness.dayIndex,
            segment: harness.currentSegment,
            hours_remaining: harness.hoursRemaining,
            ...(trackProgress
              ? {
                  [`track_progress.${trackKey}`]: {
                    next_key_override: trackProgress.next_key_override,
                    resolved_storylet_keys: trackProgress.resolved_storylet_keys,
                    state: trackProgress.state,
                  },
                }
              : {}),
            available_storylets: availableKeys,
          },
          priorSteps,
        };
      }

      // Check served_by if specified
      if (step.served_by) {
        const isChain =
          match.progress.next_key_override === step.storylet_key;
        const actualMode = isChain ? "chain" : "pool";
        if (actualMode !== step.served_by) {
          return {
            stepIndex,
            step,
            expected: `served_by=${step.served_by}`,
            observed: `served_by=${actualMode} (next_key_override=${match.progress.next_key_override ?? "null"})`,
            context: {
              day: harness.dayIndex,
              segment: harness.currentSegment,
              next_key_override: match.progress.next_key_override,
            },
            priorSteps,
          };
        }
      }

      pushTrace({
        served_storylet_key: match.storylet.storylet_key,
        served_by:
          match.progress.next_key_override === match.storylet.storylet_key
            ? "chain"
            : "pool",
        track_key: match.track.key,
        expires_on_day: match.expires_on_day,
      });
      return null;
    }

    case "expect_storylet_not_available": {
      const available = await harness.getAvailableStorylets();
      const match = available.find(
        (d) => d.storylet.storylet_key === step.storylet_key
      );

      if (match) {
        return {
          stepIndex,
          step,
          expected: `storylet_key=${step.storylet_key} NOT available`,
          observed: `storylet IS available (track=${match.track.key}, served_by=${match.progress.next_key_override === step.storylet_key ? "chain" : "pool"})`,
          context: {
            day: harness.dayIndex,
            segment: harness.currentSegment,
            track: match.track.key,
            next_key_override: match.progress.next_key_override,
          },
          priorSteps,
        };
      }
      pushTrace({ not_available: step.storylet_key });
      return null;
    }

    case "expect_resource": {
      const actual = await harness.getResource(step.name);
      if (!compareOp(actual, step.op, step.value)) {
        return {
          stepIndex,
          step,
          expected: `${step.name} ${step.op} ${step.value}`,
          observed: `${step.name} = ${actual}`,
          context: {
            day: harness.dayIndex,
            segment: harness.currentSegment,
          },
          priorSteps,
        };
      }
      pushTrace({ name: step.name, value: actual });
      return null;
    }

    case "choose": {
      // Clear walk state on terminal choice (walk flags consumed)
      harness.walkState = null;
      const outcome = await harness.choose(step.storylet_key, step.choice_id);
      pushTrace({
        storylet_key: step.storylet_key,
        choice_id: step.choice_id,
        next_key: outcome.nextKey,
        track_completed: outcome.trackCompleted,
      });
      return null;
    }

    case "choose_node": {
      // Auto-begin walk if not started yet — look back at the most recent
      // expect_storylet_available or choose step for the storylet key.
      if (!harness.walkState) {
        // Find the storylet key from prior steps
        const priorChooseOrExpect = [...priorSteps]
          .reverse()
          .find(
            (s) =>
              s.type === "expect_storylet_available" || s.type === "choose"
          );
        const key =
          priorChooseOrExpect?.type === "expect_storylet_available"
            ? priorChooseOrExpect.storylet_key
            : priorChooseOrExpect?.type === "choose"
              ? priorChooseOrExpect.storylet_key
              : null;
        if (!key) {
          throw new Error(
            `choose_node requires an active node walk. ` +
              `Add an expect_storylet_available step before the first choose_node.`
          );
        }
        harness.beginNodeWalk(key);
      }

      const walkResult = await harness.chooseNode(
        step.node_id,
        step.micro_choice_id
      );
      pushTrace({
        node_id: step.node_id,
        micro_choice_id: step.micro_choice_id,
        next_node_id: walkResult.nextNodeId,
        terminal: walkResult.terminal,
      });
      return null;
    }

    case "advance_segment": {
      await harness.advanceSegment();
      pushTrace({
        new_segment: harness.currentSegment,
        new_hours_remaining: harness.hoursRemaining,
      });
      return null;
    }

    case "sleep": {
      await harness.sleep();
      pushTrace({
        new_day: harness.dayIndex,
        new_segment: harness.currentSegment,
        new_hours_remaining: harness.hoursRemaining,
      });
      return null;
    }

    default: {
      throw new Error(`Unknown step type: ${(step as ScriptStep).type}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Failure output formatter (matches spec format exactly)
// ---------------------------------------------------------------------------

export function formatFailure(
  scriptName: string,
  failure: StepFailure
): string {
  const lines: string[] = [];
  lines.push(
    `FAIL ${scriptName} step ${failure.stepIndex + 1}: ${describeStep(failure.step)}`
  );
  lines.push(`  expected: ${failure.expected}`);
  lines.push(`  observed: ${failure.observed}`);
  lines.push(`  context:`);
  for (const [key, value] of Object.entries(failure.context)) {
    const formatted =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    lines.push(`    ${key}=${formatted}`);
  }
  lines.push(
    `  prior ${failure.priorSteps.length} steps: ${formatPriorSteps(failure.priorSteps)}`
  );
  return lines.join("\n");
}

export function formatResult(result: ScriptResult): string {
  if (result.passed) {
    return `PASS ${result.name} (${result.stepsRun} steps, ${result.durationMs}ms)`;
  }
  const lines: string[] = [];
  lines.push(
    `FAIL ${result.name} (failed at step ${result.stepsRun}/${result.totalSteps}, ${result.durationMs}ms)`
  );
  for (const failure of result.failures) {
    lines.push("");
    lines.push(formatFailure(result.name, failure));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Trace I/O + comparison (golden-file drift detection)
// ---------------------------------------------------------------------------

/** Path to the committed trace file for a script. */
export function traceFilePath(scriptName: string, scriptDir?: string): string {
  const dir = scriptDir ?? resolve("scripts/playthroughs");
  return resolve(dir, "traces", `${scriptName}.trace.json`);
}

export function writeTrace(trace: ScriptTrace, scriptDir?: string): string {
  const path = traceFilePath(trace.script_name, scriptDir);
  // Stable key order + trailing newline for git-friendly diffs.
  const json = JSON.stringify(trace, null, 2) + "\n";
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, json);
  return path;
}

export function readTrace(
  scriptName: string,
  scriptDir?: string
): ScriptTrace | null {
  const path = traceFilePath(scriptName, scriptDir);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ScriptTrace;
}

export type TraceDiff = {
  path: string;
  expected: unknown;
  actual: unknown;
};

/**
 * Deep-compare two traces. Returns an array of diffs (empty if identical).
 * Stops at the first N differing entries for readable output.
 */
export function diffTraces(
  expected: ScriptTrace,
  actual: ScriptTrace,
  maxDiffs = 10
): TraceDiff[] {
  const diffs: TraceDiff[] = [];

  if (expected.script_name !== actual.script_name) {
    diffs.push({
      path: "script_name",
      expected: expected.script_name,
      actual: actual.script_name,
    });
  }
  if (expected.total_steps !== actual.total_steps) {
    diffs.push({
      path: "total_steps",
      expected: expected.total_steps,
      actual: actual.total_steps,
    });
  }

  const len = Math.max(expected.entries.length, actual.entries.length);
  for (let i = 0; i < len && diffs.length < maxDiffs; i++) {
    const e = expected.entries[i];
    const a = actual.entries[i];
    if (!e) {
      diffs.push({ path: `entries[${i}]`, expected: undefined, actual: a });
      continue;
    }
    if (!a) {
      diffs.push({ path: `entries[${i}]`, expected: e, actual: undefined });
      continue;
    }
    const eStr = JSON.stringify(e);
    const aStr = JSON.stringify(a);
    if (eStr !== aStr) {
      diffs.push({ path: `entries[${i}]`, expected: e, actual: a });
    }
  }

  return diffs;
}

export function formatTraceDiff(diffs: TraceDiff[]): string {
  if (diffs.length === 0) return "traces match";
  const lines: string[] = [`${diffs.length} trace difference(s):`];
  for (const d of diffs) {
    lines.push(`  ${d.path}:`);
    lines.push(`    expected: ${JSON.stringify(d.expected)}`);
    lines.push(`    actual:   ${JSON.stringify(d.actual)}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Snapshot runner
// ---------------------------------------------------------------------------

export async function executeAndSnapshot(
  script: PlaythroughScript,
  options?: { scriptDir?: string; verbose?: boolean }
): Promise<{ result: ScriptResult; snapshot: FixtureSnapshot | null }> {
  const startTime = Date.now();
  const failures: StepFailure[] = [];
  const harness = new PlaythroughHarness();
  const scriptDir = options?.scriptDir ?? resolve("scripts/playthroughs");
  let snapshot: FixtureSnapshot | null = null;

  try {
    if (script.extends) {
      const fixture = loadFixture(script.extends, scriptDir);
      await harness.initFromFixture(fixture);
    } else {
      await harness.init();
    }

    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      const priorSteps = script.steps.slice(Math.max(0, i - 3), i);

      if (
        step.type === "commit_routine" ||
        step.type === "advance_day"
      ) {
        throw new Error(
          `Step type "${step.type}" is reserved but not yet implemented`
        );
      }

      try {
        const failure = await executeStep(harness, step, i, priorSteps);
        if (failure) {
          failures.push(failure);
          break;
        }
        if (options?.verbose) {
          process.stderr.write(`  ✓ step ${i + 1}: ${describeStep(step)}\n`);
        }
      } catch (err) {
        failures.push({
          stepIndex: i,
          step,
          expected: `step to execute without error`,
          observed: `error: ${(err as Error).message}`,
          context: { day: harness.dayIndex, segment: harness.currentSegment },
          priorSteps,
        });
        break;
      }
    }

    // Only snapshot if all steps passed
    if (failures.length === 0) {
      snapshot = await harness.snapshotState(script.name);
    }

    return {
      result: {
        name: script.name,
        passed: failures.length === 0,
        failures,
        stepsRun: failures.length > 0
          ? failures[0].stepIndex + 1
          : script.steps.length,
        totalSteps: script.steps.length,
        durationMs: Date.now() - startTime,
      },
      snapshot,
    };
  } finally {
    await harness.teardown().catch(() => {});
  }
}
