/**
 * Content Validation CLI — npm run validate:content
 *
 * Runs `validateStoryletIssues()` over every row in the `storylets` table and
 * fails the process if any storylet has errors. Warnings are reported but
 * non-blocking.
 *
 * Additionally enforces track-engine invariants that the schema layer does not
 * cover but the selection engine silently depends on:
 *   - track storylets MUST have storylet_key / due_offset_days / expires_after_days set
 *     (NULL default to 0 and create silent 1-day eligibility windows — the
 *     first_morning bug class).
 *   - expires_after_days and due_offset_days must be non-negative integers.
 *
 * Intended to run locally before committing and in CI. Exits non-zero on error.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { validateStoryletIssues } from "@/core/validation/storyletValidation";
import type { ValidationIssue } from "@/core/validation/storyletValidation";

// ─── env loading (parity with playthrough runner client.ts) ─────────────────

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    "validate:content requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Skipping content validation (no credentials available)."
  );
  process.exit(0);
}

const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── track-engine invariants ────────────────────────────────────────────────

type TrackFieldIssue = {
  storyletId: string;
  slug: string;
  path: string;
  message: string;
};

function validateTrackFields(row: {
  id: string;
  slug: string | null;
  track_id: string | null;
  storylet_key: string | null;
  due_offset_days: number | null;
  expires_after_days: number | null;
}): TrackFieldIssue[] {
  const issues: TrackFieldIssue[] = [];
  // Only apply these checks to track-member storylets (track_id not null).
  if (!row.track_id) return issues;

  const base = { storyletId: row.id, slug: row.slug ?? "" };

  if (!row.storylet_key) {
    issues.push({
      ...base,
      path: "storylet_key",
      message: "track storylet is missing storylet_key",
    });
  }

  if (row.due_offset_days === null || row.due_offset_days === undefined) {
    issues.push({
      ...base,
      path: "due_offset_days",
      message:
        "track storylet is missing due_offset_days (NULL is silently treated as 0)",
    });
  } else if (!Number.isInteger(row.due_offset_days) || row.due_offset_days < 0) {
    issues.push({
      ...base,
      path: "due_offset_days",
      message: `due_offset_days must be a non-negative integer (got ${row.due_offset_days})`,
    });
  }

  if (row.expires_after_days === null || row.expires_after_days === undefined) {
    // This is the first_morning bug class: NULL defaults to 0 → 1-day window only.
    issues.push({
      ...base,
      path: "expires_after_days",
      message:
        "track storylet is missing expires_after_days (NULL silently creates a 1-day eligibility window — the first_morning bug class)",
    });
  } else if (
    !Number.isInteger(row.expires_after_days) ||
    row.expires_after_days < 0
  ) {
    issues.push({
      ...base,
      path: "expires_after_days",
      message: `expires_after_days must be a non-negative integer (got ${row.expires_after_days})`,
    });
  }

  return issues;
}

// ─── reporting ──────────────────────────────────────────────────────────────

function printIssues(label: string, issues: ValidationIssue[] | TrackFieldIssue[]): void {
  if (issues.length === 0) return;
  console.log(`\n${label} (${issues.length}):`);
  for (const i of issues) {
    const slug = i.slug || i.storyletId;
    console.log(`  [${slug}] ${i.path}: ${i.message}`);
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { data: rows, error } = await client
    .from("storylets")
    .select(
      "id, slug, title, body, choices, is_active, weight, tags, requirements, " +
        "introduces_npc, track_id, storylet_key, order_index, due_offset_days, " +
        "expires_after_days, default_next_key, segment, time_cost_hours, is_conflict, nodes"
    );

  if (error) {
    console.error("Failed to load storylets from Supabase:", error.message);
    process.exit(1);
  }

  // Cast once to a narrow row shape — the untyped Supabase select returns a
  // wide union with error variants that would otherwise obscure the loop type.
  const storylets = (rows ?? []) as unknown as Array<{
    id: string;
    slug: string | null;
    track_id: string | null;
    storylet_key: string | null;
    due_offset_days: number | null;
    expires_after_days: number | null;
  } & Record<string, unknown>>;

  const allErrors: ValidationIssue[] = [];
  const allWarnings: ValidationIssue[] = [];
  const allTrackIssues: TrackFieldIssue[] = [];

  for (const row of storylets) {
    const { errors, warnings } = validateStoryletIssues(row);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    allTrackIssues.push(...validateTrackFields(row));
  }

  console.log(`Validated ${storylets.length} storylets from Supabase.`);
  printIssues("Schema errors", allErrors);
  printIssues("Track-field errors (engine invariants)", allTrackIssues);
  printIssues("Warnings (non-blocking)", allWarnings);

  const fatalCount = allErrors.length + allTrackIssues.length;
  if (fatalCount > 0) {
    console.error(`\n${fatalCount} fatal validation error(s). Failing.`);
    process.exit(1);
  }

  console.log("\nAll content passes validation.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
