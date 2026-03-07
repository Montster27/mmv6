#!/usr/bin/env node
/**
 * scripts/generate-migration.ts
 *
 * Reads all content/storylets/*.json files and generates a Supabase SQL
 * migration file that upserts the storylets into public.storylets.
 *
 * Usage:
 *   npx tsx scripts/generate-migration.ts
 *   npx tsx scripts/generate-migration.ts --dry-run   (print SQL, don't write file)
 *   npx tsx scripts/generate-migration.ts --output path/to/output.sql
 *
 * After running, apply with:
 *   supabase db push     (remote)
 *   supabase migration up  (local)
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join, basename } from "path";

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const outputFlag = args.findIndex((a) => a === "--output");
const customOutput =
  outputFlag >= 0 ? args[outputFlag + 1] : undefined;

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT = resolve(process.cwd());
const CONTENT_STORYLETS = join(ROOT, "content", "storylets");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

// ─── SQL helpers ─────────────────────────────────────────────────────────────

/** Escape a value for a standard SQL string literal (single-quote escaped). */
function sqlLiteral(val: string): string {
  return "'" + val.replace(/'/g, "''") + "'";
}

/** Wrap a value as a JSONB literal. */
function jsonbLiteral(val: unknown): string {
  return sqlLiteral(JSON.stringify(val)) + "::jsonb";
}

/** Format a string[] as a Postgres ARRAY literal. */
function pgArrayLiteral(arr: string[]): string {
  if (arr.length === 0) return "ARRAY[]::text[]";
  const items = arr.map((s) => "'" + s.replace(/'/g, "''") + "'").join(", ");
  return `ARRAY[${items}]`;
}

// ─── Known SQL columns ────────────────────────────────────────────────────────
// Only these fields are written to the database. Everything else in the JSON
// (including _meta, reaction_text, relational_effects, etc.) is stored inside
// the choices JSONB column and passed through as-is.
const SQL_COLUMNS = ["slug", "title", "body", "choices", "tags", "requirements", "weight", "is_active"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryletEntry {
  slug: string;
  title: string;
  body: string;
  is_active: boolean;
  tags?: string[];
  weight?: number;
  requirements?: Record<string, unknown>;
  choices: unknown[];
  [key: string]: unknown;
}

interface ContentFile {
  version: string;
  _meta?: unknown;
  storylets: StoryletEntry[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

const KNOWN_REQUIREMENT_KEYS = new Set([
  "audit",
  "min_day_index",
  "max_day_index",
  "trigger_phase",
  "requires_tags_any",
  "vectors_min",
  "min_season_index",
  "max_season_index",
  "seasons_any",
  "audience",
  "max_total_runs",
  "requires_npc_met",
  "requires_npc_not_met",
  "requires_not_precluded",
  "requires_cash_min",
  "requires_knowledge_min",
  "requires_social_leverage_min",
  "requires_physical_resilience_min",
  "requires_money_band",
]);

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function validateStoryletEntry(
  entry: StoryletEntry,
  sourceFile: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `[${sourceFile} → ${entry.slug ?? "(no slug)"}]`;

  if (!entry.slug || typeof entry.slug !== "string") {
    errors.push(`${prefix} Missing or invalid 'slug'`);
  } else if (!/^[a-z0-9_]+$/.test(entry.slug)) {
    errors.push(`${prefix} 'slug' must be snake_case (a-z, 0-9, _)`);
  }

  if (!entry.title || typeof entry.title !== "string") {
    errors.push(`${prefix} Missing 'title'`);
  }

  if (!entry.body || typeof entry.body !== "string") {
    errors.push(`${prefix} Missing 'body'`);
  } else if (entry.body.length > 4000) {
    warnings.push(`${prefix} 'body' exceeds 4000 chars (${entry.body.length})`);
  }

  if (entry.is_active !== undefined && typeof entry.is_active !== "boolean") {
    errors.push(`${prefix} 'is_active' must be a boolean (omit to default true)`);
  }

  if (!Array.isArray(entry.choices) || entry.choices.length === 0) {
    errors.push(`${prefix} 'choices' must be a non-empty array`);
  }

  if (entry.requirements && typeof entry.requirements === "object") {
    const unknownKeys = Object.keys(entry.requirements).filter(
      (k) => !KNOWN_REQUIREMENT_KEYS.has(k)
    );
    if (unknownKeys.length > 0) {
      warnings.push(
        `${prefix} Unknown requirement keys (will be stored but not evaluated): ${unknownKeys.join(", ")}`
      );
    }
  }

  return { errors, warnings };
}

// ─── SQL generation ───────────────────────────────────────────────────────────

function buildInsertStatement(entry: StoryletEntry): string {
  const slug = sqlLiteral(entry.slug);
  const title = sqlLiteral(entry.title);
  const body = sqlLiteral(entry.body);
  const choices = jsonbLiteral(entry.choices);
  const tags = pgArrayLiteral(Array.isArray(entry.tags) ? entry.tags : []);
  const requirements = jsonbLiteral(
    entry.requirements && typeof entry.requirements === "object"
      ? entry.requirements
      : {}
  );
  const weight =
    typeof entry.weight === "number" ? entry.weight : 100;
  const isActive = entry.is_active !== false ? "true" : "false";

  return `
INSERT INTO public.storylets (slug, title, body, choices, tags, requirements, weight, is_active)
VALUES (
  ${slug},
  ${title},
  ${body},
  ${choices},
  ${tags},
  ${requirements},
  ${weight},
  ${isActive}
)
ON CONFLICT (slug) DO UPDATE SET
  title        = EXCLUDED.title,
  body         = EXCLUDED.body,
  choices      = EXCLUDED.choices,
  tags         = EXCLUDED.tags,
  requirements = EXCLUDED.requirements,
  weight       = EXCLUDED.weight,
  is_active    = EXCLUDED.is_active,
  updated_at   = now();`.trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // 1. Find all JSON files in content/storylets/
  let jsonFiles: string[];
  try {
    jsonFiles = readdirSync(CONTENT_STORYLETS)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(CONTENT_STORYLETS, f));
  } catch (err) {
    console.error(`✗ Cannot read ${CONTENT_STORYLETS}:`, (err as Error).message);
    process.exit(1);
  }

  if (jsonFiles.length === 0) {
    console.error(`✗ No JSON files found in ${CONTENT_STORYLETS}`);
    process.exit(1);
  }

  // 2. Parse and validate all files
  const allStorylets: Array<{ entry: StoryletEntry; source: string }> = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const filePath of jsonFiles) {
    const fileName = basename(filePath);
    let parsed: ContentFile;

    try {
      const raw = readFileSync(filePath, "utf-8");
      parsed = JSON.parse(raw) as ContentFile;
    } catch (err) {
      allErrors.push(`[${fileName}] JSON parse error: ${(err as Error).message}`);
      continue;
    }

    if (parsed.version !== "1") {
      allErrors.push(`[${fileName}] Unsupported version: ${parsed.version}`);
      continue;
    }

    if (!Array.isArray(parsed.storylets)) {
      allErrors.push(`[${fileName}] Missing 'storylets' array`);
      continue;
    }

    for (const entry of parsed.storylets) {
      const { errors, warnings } = validateStoryletEntry(entry, fileName);
      allErrors.push(...errors);
      allWarnings.push(...warnings);
      if (errors.length === 0) {
        allStorylets.push({ entry, source: fileName });
      }
    }
  }

  // 3. Check for duplicate slugs across files
  const slugCounts = new Map<string, number>();
  for (const { entry } of allStorylets) {
    slugCounts.set(entry.slug, (slugCounts.get(entry.slug) ?? 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      allErrors.push(`Duplicate slug '${slug}' appears ${count} times`);
    }
  }

  // 4. Report warnings
  if (allWarnings.length > 0) {
    console.warn("\nWarnings:");
    for (const w of allWarnings) console.warn(`  ⚠  ${w}`);
  }

  // 5. Fail on errors
  if (allErrors.length > 0) {
    console.error("\nErrors:");
    for (const e of allErrors) console.error(`  ✗  ${e}`);
    console.error(`\n✗ ${allErrors.length} error(s). No migration generated.`);
    process.exit(1);
  }

  if (allStorylets.length === 0) {
    console.error("✗ No valid storylets found.");
    process.exit(1);
  }

  // 6. Build migration SQL
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:]/g, "")
    .replace(/\..+/, "")
    .slice(0, 14); // e.g. 20260306120000

  const sourceList = [...new Set(allStorylets.map((s) => s.source))].join(", ");

  const lines: string[] = [
    `-- Auto-generated by scripts/generate-migration.ts`,
    `-- Source files: ${sourceList}`,
    `-- Storylets: ${allStorylets.length}`,
    `-- Generated: ${new Date().toISOString()}`,
    `--`,
    `-- Apply with: supabase db push  OR  supabase migration up`,
    ``,
  ];

  for (const { entry } of allStorylets) {
    lines.push(`-- ${entry.slug}: ${entry.title}`);
    lines.push(buildInsertStatement(entry));
    lines.push("");
  }

  const sql = lines.join("\n");

  // 7. Write or print
  if (dryRun) {
    console.log(sql);
    console.log(
      `\n✓ Dry run: ${allStorylets.length} storylet(s) from ${jsonFiles.length} file(s). No file written.`
    );
    return;
  }

  const outputPath =
    customOutput ??
    join(MIGRATIONS_DIR, `${timestamp}_content_import.sql`);

  try {
    writeFileSync(outputPath, sql, "utf-8");
  } catch (err) {
    console.error(`✗ Failed to write ${outputPath}:`, (err as Error).message);
    process.exit(1);
  }

  console.log(`\n✓ ${allStorylets.length} storylet(s) from ${jsonFiles.length} file(s)`);
  console.log(`✓ Written to: ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  supabase db push            # push to remote`);
  console.log(`  supabase migration up       # apply locally`);
}

main();
