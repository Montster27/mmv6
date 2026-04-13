/**
 * Playthrough Runner — Script Executor
 *
 * Loads YAML scripts, walks steps, runs assertions, collects failures.
 * Failure output is the most important deliverable.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import * as yaml from "js-yaml";
import { PlaythroughHarness } from "./harness";
import type {
  PlaythroughScript,
  ScriptStep,
  StepFailure,
  ScriptResult,
  FixtureSnapshot,
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
  options?: { scriptDir?: string; verbose?: boolean }
): Promise<ScriptResult> {
  const startTime = Date.now();
  const failures: StepFailure[] = [];
  const harness = new PlaythroughHarness();
  const scriptDir = options?.scriptDir ?? resolve("scripts/playthroughs");

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
        step.type === "choose_node" ||
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

    return {
      name: script.name,
      passed: failures.length === 0,
      failures,
      stepsRun: failures.length > 0
        ? (failures[0].stepIndex + 1)
        : script.steps.length,
      totalSteps: script.steps.length,
      durationMs: Date.now() - startTime,
    };
  } finally {
    await harness.teardown().catch((err) => {
      console.error(`[runner] teardown failed: ${(err as Error).message}`);
    });
  }
}

/**
 * Execute a single step. Returns a StepFailure if the assertion fails, null if OK.
 * Throws on hard errors (DB failures, missing storylets, etc.).
 */
async function executeStep(
  harness: PlaythroughHarness,
  step: ScriptStep,
  stepIndex: number,
  priorSteps: ScriptStep[]
): Promise<StepFailure | null> {
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
      return null;
    }

    case "choose": {
      await harness.choose(step.storylet_key, step.choice_id);
      return null;
    }

    case "advance_segment": {
      await harness.advanceSegment();
      return null;
    }

    case "sleep": {
      await harness.sleep();
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
        step.type === "choose_node" ||
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
