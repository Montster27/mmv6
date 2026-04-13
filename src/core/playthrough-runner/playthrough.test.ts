/**
 * Playthrough Runner — Vitest Integration
 *
 * Globs all YAML scripts in scripts/playthroughs/ and runs each as a test case.
 * Skips files prefixed with _ (helper scripts like _fresh_start.yaml).
 *
 * Usage:
 *   npx vitest run src/core/playthrough-runner/playthrough.test.ts
 *   npx vitest run --reporter verbose -- playthrough
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadScript, executeScript, formatResult } from "./executor";
import { clearCache } from "./loader";

const SCRIPTS_DIR = resolve(process.cwd(), "scripts/playthroughs");

const scriptFiles = readdirSync(SCRIPTS_DIR)
  .filter((f) => (f.endsWith(".yaml") || f.endsWith(".yml")) && !f.startsWith("_"))
  .sort();

describe("playthrough scripts", () => {
  for (const file of scriptFiles) {
    it(
      file.replace(/\.ya?ml$/, ""),
      async () => {
        clearCache();
        const script = loadScript(resolve(SCRIPTS_DIR, file));
        const result = await executeScript(script, {
          scriptDir: SCRIPTS_DIR,
          verbose: false,
        });

        if (!result.passed) {
          // Print the formatted failure output for debugging
          throw new Error(`\n${formatResult(result)}`);
        }

        expect(result.passed).toBe(true);
        expect(result.stepsRun).toBe(result.totalSteps);
      },
      { timeout: 60_000 }
    );
  }
});
