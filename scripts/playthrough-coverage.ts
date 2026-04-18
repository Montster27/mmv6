/**
 * Playthrough Coverage Reporter — npm run playthrough:coverage
 *
 * Cross-references storylet_keys referenced by YAML playthrough scripts against
 * the full storylet catalog in Supabase, grouped by track. Surfaces content
 * that is not exercised by any playthrough.
 *
 * Intent: as content grows, the number of untouched storylets per track should
 * be visible in PR review so gaps don't go unnoticed. This is a reporter, not
 * a gate — it always exits 0.
 *
 * Output shape:
 *   Track [track_key] — N total, M tested, K untested
 *     untested:
 *       - storylet_key_1
 *       - storylet_key_2
 *
 * Scans:
 *   - expect_storylet_available.storylet_key
 *   - expect_storylet_not_available.storylet_key
 *   - choose.storylet_key
 *
 * Does NOT count as "tested":
 *   - storylets reached transitively via default_next_key chains but never
 *     referenced by name in a script. This is intentional — a storylet that
 *     chains through without any assertion has zero regression protection.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";

// ─── env loading (parity with validate-content.ts) ──────────────────────────

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
  console.error(
    "playthrough:coverage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them in .env.local or as environment variables."
  );
  process.exit(1);
}

const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── script parsing ─────────────────────────────────────────────────────────

const SCRIPTS_DIR = resolve(process.cwd(), "scripts/playthroughs");

type ParsedStep = { type?: string; storylet_key?: string };
type ParsedScript = { name?: string; steps?: ParsedStep[] };

const STEP_TYPES_WITH_KEY = new Set([
  "expect_storylet_available",
  "expect_storylet_not_available",
  "choose",
]);

/** Read every YAML script and collect all referenced storylet_keys. */
function collectReferencedKeys(): {
  referenced: Set<string>;
  byScript: Map<string, Set<string>>;
} {
  const referenced = new Set<string>();
  const byScript = new Map<string, Set<string>>();

  const files = readdirSync(SCRIPTS_DIR)
    .filter(
      (f) =>
        (f.endsWith(".yaml") || f.endsWith(".yml")) && !f.startsWith("_")
    )
    .sort();

  for (const file of files) {
    const text = readFileSync(resolve(SCRIPTS_DIR, file), "utf8");
    const parsed = loadYaml(text) as ParsedScript | null;
    if (!parsed || !Array.isArray(parsed.steps)) continue;

    const keysInScript = new Set<string>();
    for (const step of parsed.steps) {
      if (
        step &&
        typeof step.type === "string" &&
        STEP_TYPES_WITH_KEY.has(step.type) &&
        typeof step.storylet_key === "string"
      ) {
        keysInScript.add(step.storylet_key);
        referenced.add(step.storylet_key);
      }
    }
    byScript.set(parsed.name ?? file, keysInScript);
  }

  return { referenced, byScript };
}

// ─── DB load ────────────────────────────────────────────────────────────────

type StoryletRow = {
  id: string;
  slug: string | null;
  storylet_key: string | null;
  track_id: string | null;
  is_active: boolean | null;
};

type TrackRow = {
  id: string;
  key: string;
  title: string;
};

async function loadCatalog(): Promise<{
  storylets: StoryletRow[];
  trackById: Map<string, TrackRow>;
}> {
  const [storyletsRes, tracksRes] = await Promise.all([
    client.from("storylets").select("id, slug, storylet_key, track_id, is_active"),
    client.from("tracks").select("id, key, title"),
  ]);

  if (storyletsRes.error) {
    throw new Error(`Failed to load storylets: ${storyletsRes.error.message}`);
  }
  if (tracksRes.error) {
    throw new Error(`Failed to load tracks: ${tracksRes.error.message}`);
  }

  const storylets = (storyletsRes.data ?? []) as unknown as StoryletRow[];
  const tracks = (tracksRes.data ?? []) as unknown as TrackRow[];

  const trackById = new Map<string, TrackRow>();
  for (const t of tracks) trackById.set(t.id, t);

  return { storylets, trackById };
}

// ─── reporting ──────────────────────────────────────────────────────────────

type TrackBucket = {
  trackKey: string;
  trackTitle: string;
  total: number;
  tested: string[];
  untested: string[];
};

function bucketize(
  storylets: StoryletRow[],
  trackById: Map<string, TrackRow>,
  referenced: Set<string>
): { trackBuckets: TrackBucket[]; standalone: TrackBucket } {
  const buckets = new Map<string, TrackBucket>();
  const standalone: TrackBucket = {
    trackKey: "(standalone)",
    trackTitle: "Standalone / No Track",
    total: 0,
    tested: [],
    untested: [],
  };

  for (const row of storylets) {
    if (row.is_active === false) continue;
    const key = row.storylet_key ?? row.slug;
    if (!key) continue;

    const bucket =
      row.track_id && trackById.has(row.track_id)
        ? buckets.get(row.track_id) ??
          (() => {
            const track = trackById.get(row.track_id!)!;
            const b: TrackBucket = {
              trackKey: track.key,
              trackTitle: track.title,
              total: 0,
              tested: [],
              untested: [],
            };
            buckets.set(row.track_id!, b);
            return b;
          })()
        : standalone;

    bucket.total += 1;
    if (referenced.has(key)) bucket.tested.push(key);
    else bucket.untested.push(key);
  }

  const trackBuckets = Array.from(buckets.values()).sort((a, b) =>
    a.trackKey.localeCompare(b.trackKey)
  );
  for (const b of [...trackBuckets, standalone]) {
    b.tested.sort();
    b.untested.sort();
  }
  return { trackBuckets, standalone };
}

function printBucket(bucket: TrackBucket): void {
  const pct =
    bucket.total === 0 ? 0 : Math.round((bucket.tested.length / bucket.total) * 100);
  console.log(
    `\nTrack [${bucket.trackKey}] "${bucket.trackTitle}" — ` +
      `${bucket.total} total, ${bucket.tested.length} tested (${pct}%), ` +
      `${bucket.untested.length} untested`
  );
  if (bucket.untested.length > 0) {
    console.log("  untested:");
    for (const k of bucket.untested) console.log(`    - ${k}`);
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { referenced, byScript } = collectReferencedKeys();
  const { storylets, trackById } = await loadCatalog();

  console.log(
    `Parsed ${byScript.size} playthrough scripts, ` +
      `found ${referenced.size} distinct storylet_keys referenced.`
  );
  console.log(`Loaded ${storylets.length} active storylets from Supabase.`);

  const { trackBuckets, standalone } = bucketize(storylets, trackById, referenced);

  // Referenced-but-not-in-catalog keys (dead references — typos, deleted content).
  const activeKeys = new Set<string>();
  for (const row of storylets) {
    if (row.is_active === false) continue;
    const k = row.storylet_key ?? row.slug;
    if (k) activeKeys.add(k);
  }
  const dead: string[] = [];
  for (const k of referenced) if (!activeKeys.has(k)) dead.push(k);
  dead.sort();

  let grandTotal = 0;
  let grandTested = 0;
  for (const b of trackBuckets) {
    printBucket(b);
    grandTotal += b.total;
    grandTested += b.tested.length;
  }
  if (standalone.total > 0) {
    printBucket(standalone);
    grandTotal += standalone.total;
    grandTested += standalone.tested.length;
  }

  console.log("\n" + "─".repeat(60));
  const pct = grandTotal === 0 ? 0 : Math.round((grandTested / grandTotal) * 100);
  console.log(
    `Overall: ${grandTested} / ${grandTotal} storylets referenced by ` +
      `at least one playthrough (${pct}%).`
  );

  if (dead.length > 0) {
    console.log(
      `\nReferenced but not found in active storylets (${dead.length}) — ` +
        `dead references, typos, or deactivated content:`
    );
    for (const k of dead) console.log(`  - ${k}`);
  }

  // Always exit 0 — this is a reporter, not a gate.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
