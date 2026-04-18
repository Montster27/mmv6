#!/usr/bin/env node
/**
 * Playthrough Runner — CLI
 *
 * Usage:
 *   npm run playthrough <script-path>           # single script
 *   npm run playthrough:all                     # all scripts (CI)
 *   npm run playthrough:snapshot <script-path>  # run + save fixture
 *   npm run playthrough -- --write-trace <path> # run + save trace JSON
 *   npm run playthrough -- --check-trace <path> # run + diff vs committed trace
 *   npm run playthrough -- --write-trace --all  # regenerate all traces
 *   npm run playthrough -- --check-trace --all  # verify all traces (CI/local)
 */

import { resolve, basename } from "node:path";
import { readdirSync, writeFileSync } from "node:fs";
import {
  loadScript,
  executeScript,
  executeAndSnapshot,
  formatResult,
  writeTrace,
  readTrace,
  diffTraces,
  formatTraceDiff,
} from "./executor";
import { clearCache } from "./loader";

const SCRIPTS_DIR = resolve(process.cwd(), "scripts/playthroughs");

type RunMode = "normal" | "snapshot" | "write-trace" | "check-trace";

async function runSingle(
  scriptPath: string,
  mode: RunMode = "normal"
): Promise<boolean> {
  const script = loadScript(scriptPath);
  process.stderr.write(`Running: ${script.name}\n`);

  if (mode === "snapshot") {
    const { result, snapshot: snap } = await executeAndSnapshot(script, {
      scriptDir: SCRIPTS_DIR,
      verbose: true,
    });
    console.log(formatResult(result));
    if (snap) {
      const outPath = resolve(
        SCRIPTS_DIR,
        "fixtures",
        `after_${script.name}.snapshot.json`
      );
      writeFileSync(outPath, JSON.stringify(snap, null, 2));
      console.log(`Snapshot saved: ${outPath}`);
    }
    return result.passed;
  }

  if (mode === "write-trace" || mode === "check-trace") {
    const result = await executeScript(script, {
      scriptDir: SCRIPTS_DIR,
      verbose: true,
      recordTrace: true,
    });
    console.log(formatResult(result));
    if (!result.passed || !result.trace) return result.passed;

    if (mode === "write-trace") {
      const out = writeTrace(result.trace, SCRIPTS_DIR);
      console.log(`Trace saved: ${out}`);
      return true;
    }

    // check-trace
    const expected = readTrace(script.name, SCRIPTS_DIR);
    if (!expected) {
      console.error(
        `No committed trace found for "${script.name}". ` +
          `Run with --write-trace first.`
      );
      return false;
    }
    const diffs = diffTraces(expected, result.trace);
    if (diffs.length === 0) {
      console.log(`Trace matches for "${script.name}".`);
      return true;
    }
    console.error(`Trace drift for "${script.name}":\n${formatTraceDiff(diffs)}`);
    return false;
  }

  const result = await executeScript(script, {
    scriptDir: SCRIPTS_DIR,
    verbose: true,
  });
  console.log(formatResult(result));
  return result.passed;
}

async function runAll(mode: RunMode = "normal"): Promise<boolean> {
  const files = readdirSync(SCRIPTS_DIR)
    .filter((f) => (f.endsWith(".yaml") || f.endsWith(".yml")) && !f.startsWith("_"))
    .sort();

  if (files.length === 0) {
    console.log("No scripts found in", SCRIPTS_DIR);
    return true;
  }

  console.log(`Found ${files.length} scripts in ${SCRIPTS_DIR}\n`);

  let allPassed = true;
  const results: Array<{ name: string; passed: boolean; ms: number }> = [];

  for (const file of files) {
    clearCache(); // Fresh content load per script
    const scriptPath = resolve(SCRIPTS_DIR, file);
    const passed = await runSingle(scriptPath, mode);
    const script = loadScript(scriptPath);
    results.push({ name: script.name, passed, ms: 0 });
    if (!passed) allPassed = false;
    console.log();
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log("─".repeat(60));
  console.log(`${passed} passed, ${failed} failed, ${results.length} total`);

  return allPassed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isAll = args.includes("--all");

  let mode: RunMode = "normal";
  if (args.includes("--snapshot")) mode = "snapshot";
  else if (args.includes("--write-trace")) mode = "write-trace";
  else if (args.includes("--check-trace")) mode = "check-trace";

  const scriptPaths = args.filter((a) => !a.startsWith("--"));

  let success: boolean;

  if (isAll || scriptPaths.length === 0) {
    success = await runAll(mode);
  } else {
    success = true;
    for (const sp of scriptPaths) {
      const passed = await runSingle(resolve(sp), mode);
      if (!passed) success = false;
    }
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
