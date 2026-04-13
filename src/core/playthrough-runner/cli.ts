#!/usr/bin/env node
/**
 * Playthrough Runner — CLI
 *
 * Usage:
 *   npm run playthrough <script-path>          # single script
 *   npm run playthrough:all                    # all scripts (CI)
 *   npm run playthrough:snapshot <script-path> # run + save fixture
 */

import { resolve, basename } from "node:path";
import { readdirSync, writeFileSync } from "node:fs";
import {
  loadScript,
  executeScript,
  executeAndSnapshot,
  formatResult,
} from "./executor";
import { clearCache } from "./loader";

const SCRIPTS_DIR = resolve(process.cwd(), "scripts/playthroughs");

async function runSingle(scriptPath: string, snapshot = false): Promise<boolean> {
  const script = loadScript(scriptPath);
  process.stderr.write(`Running: ${script.name}\n`);

  if (snapshot) {
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

  const result = await executeScript(script, {
    scriptDir: SCRIPTS_DIR,
    verbose: true,
  });
  console.log(formatResult(result));
  return result.passed;
}

async function runAll(): Promise<boolean> {
  const files = readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
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
    const script = loadScript(resolve(SCRIPTS_DIR, file));
    process.stderr.write(`Running: ${script.name}\n`);

    const result = await executeScript(script, {
      scriptDir: SCRIPTS_DIR,
      verbose: true,
    });
    console.log(formatResult(result));
    console.log();

    results.push({
      name: result.name,
      passed: result.passed,
      ms: result.durationMs,
    });
    if (!result.passed) allPassed = false;
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log("─".repeat(60));
  console.log(
    `${passed} passed, ${failed} failed, ${results.length} total (${results.reduce((s, r) => s + r.ms, 0)}ms)`
  );

  return allPassed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isSnapshot = args.includes("--snapshot");
  const isAll = args.includes("--all");
  const scriptPaths = args.filter((a) => !a.startsWith("--"));

  let success: boolean;

  if (isAll || scriptPaths.length === 0) {
    success = await runAll();
  } else {
    success = true;
    for (const sp of scriptPaths) {
      const passed = await runSingle(resolve(sp), isSnapshot);
      if (!passed) success = false;
    }
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
