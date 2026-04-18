/**
 * Playthrough Runner — Vitest Integration
 *
 * Globs all YAML scripts in scripts/playthroughs/ and runs each as a test case.
 * Skips files prefixed with _ (helper scripts like _fresh_start.yaml).
 *
 * When a committed trace exists at scripts/playthroughs/traces/<name>.trace.json,
 * the test also asserts the live trace matches — this is the drift detector.
 * A diff in what a playthrough does (storylet served, choice chain, segment
 * math) surfaces as a failed assertion with the specific entry that changed.
 *
 * Usage:
 *   npx vitest run src/core/playthrough-runner/playthrough.test.ts
 *   npx vitest run --reporter verbose -- playthrough
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const SCRIPTS_DIR = resolve(process.cwd(), "scripts/playthroughs");

const scriptFiles = readdirSync(SCRIPTS_DIR)
  .filter((f) => (f.endsWith(".yaml") || f.endsWith(".yml")) && !f.startsWith("_"))
  .sort();

// The runner imports `./client.ts`, which requires real Supabase credentials at
// module-load time. When running in CI without those creds (the common case),
// skip the whole suite rather than crash the test file.
const hasSupabaseCreds =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://localhost";

if (hasSupabaseCreds) {
  const { loadScript, executeScript, formatResult, readTrace, diffTraces, formatTraceDiff } =
    await import("./executor");
  const { clearCache } = await import("./loader");

  describe("playthrough scripts", () => {
    for (const file of scriptFiles) {
      it(
        file.replace(/\.ya?ml$/, ""),
        async () => {
          clearCache();
          const script = loadScript(resolve(SCRIPTS_DIR, file));
          const committedTrace = readTrace(script.name, SCRIPTS_DIR);
          const result = await executeScript(script, {
            scriptDir: SCRIPTS_DIR,
            verbose: false,
            recordTrace: committedTrace != null,
          });

          if (!result.passed) {
            throw new Error(`\n${formatResult(result)}`);
          }

          expect(result.passed).toBe(true);
          expect(result.stepsRun).toBe(result.totalSteps);

          if (committedTrace && result.trace) {
            const diffs = diffTraces(committedTrace, result.trace);
            if (diffs.length > 0) {
              throw new Error(
                `Trace drift in "${script.name}":\n${formatTraceDiff(diffs)}\n\n` +
                  `If this change is intentional, regenerate with: ` +
                  `npm run playthrough:trace:write`
              );
            }
          }
        },
        { timeout: 60_000 }
      );
    }
  });
} else {
  describe.skip("playthrough scripts (requires Supabase credentials)", () => {
    it("skipped", () => {});
  });
}
