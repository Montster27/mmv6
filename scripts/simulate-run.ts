#!/usr/bin/env node
/**
 * scripts/simulate-run.ts
 *
 * Simulates N full playthroughs of Arc One, selecting random choices at each
 * storylet slot and logging what happens.
 *
 * Usage:
 *   npx tsx scripts/simulate-run.ts --user-id=<uuid> --runs=3 [--days=10] [--seed=42] [--verbose]
 *
 * Env vars are loaded automatically from .env.local in the project root.
 * Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ─── Inline .env.local loader ─────────────────────────────────────────────────
// We don't depend on dotenv. This handles the basic KEY=value format used in
// .env.local. Existing process.env values take priority (don't override).
function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not present — caller handles missing vars
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

// ─── Project imports (tsx resolves @/ via tsconfig.json paths) ───────────────
// All of these are pure functions with no browser/server-only side effects.
import { selectStorylets } from "../src/core/storylets/selectStorylets";
import {
  coerceStoryletRow,
  validateStorylet,
} from "../src/core/validation/storyletValidation";
import {
  applyRelationshipEvents,
  ensureRelationshipDefaults,
  mapLegacyRelationalEffects,
  mapLegacyNpcKnowledge,
} from "../src/lib/relationships";
import type { DailyState } from "../src/types/daily";
import type { Storylet, StoryletRun } from "../src/types/storylets";
import type { RelationshipState } from "../src/lib/relationships";

// ─── CLI args ─────────────────────────────────────────────────────────────────

interface SimArgs {
  userId: string;
  runs: number;
  days: number;
  seed: number;
  verbose: boolean;
}

function parseArgs(): SimArgs {
  const raw = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const [key, ...rest] = a.slice(2).split("=");
        return [key, rest.join("=") || "true"];
      })
  );

  const userId = raw["user-id"];
  if (!userId) {
    console.error(
      [
        "",
        "  Usage: npx tsx scripts/simulate-run.ts --user-id=<uuid> --runs=3 [--days=10] [--seed=42] [--verbose]",
        "",
        "  --user-id   Required. A valid user UUID from your Supabase auth.users table.",
        "  --runs      Number of complete playthroughs to simulate (default: 1).",
        "  --days      Days per run (default: 10, i.e. full Arc One).",
        "  --seed      Integer seed for reproducible random picks (default: current timestamp).",
        "  --verbose   Print full storylet body and reaction text to console.",
        "",
      ].join("\n")
    );
    process.exit(1);
  }

  return {
    userId,
    runs: Math.max(1, parseInt(raw.runs ?? "1", 10)),
    days: Math.max(1, parseInt(raw.days ?? "10", 10)),
    seed: parseInt(raw.seed ?? String(Date.now()), 10),
    verbose: raw.verbose === "true",
  };
}

// ─── Supabase admin client (service role bypasses RLS) ───────────────────────

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "\n  ✗ Missing env vars. Ensure .env.local contains:\n" +
        "      NEXT_PUBLIC_SUPABASE_URL=...\n" +
        "      SUPABASE_SERVICE_ROLE_KEY=...\n"
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type DB = ReturnType<typeof makeAdminClient>;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function utcToday(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/** Returns YYYY-MM-DD shifted by n calendar days (negative = past). */
function shiftDate(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Seeded PRNG (linear congruential, deterministic) ────────────────────────

function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0x100000000;
  };
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ─── Supabase queries ─────────────────────────────────────────────────────────

async function fetchCurrentSeasonIndex(db: DB): Promise<number> {
  const today = utcToday();
  const { data } = await db
    .from("seasons")
    .select("season_index")
    .lte("starts_at", today)
    .gte("ends_at", today)
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.season_index ?? 1;
}

async function fetchArcOneStorylets(db: DB): Promise<Storylet[]> {
  const { data, error } = await db
    .from("storylets")
    .select("id,slug,title,body,choices,tags,is_active,requirements,weight")
    .eq("is_active", true)
    .contains("tags", ["arc_one_core"]);

  if (error) throw new Error(`fetchArcOneStorylets: ${error.message}`);

  return (data ?? []).flatMap((row: any) => {
    const choices = Array.isArray(row.choices)
      ? row.choices
      : typeof row.choices === "string"
        ? (() => { try { return JSON.parse(row.choices); } catch { return []; } })()
        : [];
    const coerced = coerceStoryletRow({ ...row, choices });
    const validated = validateStorylet(coerced);
    if (!validated.ok) {
      console.warn(`  ⚠ Invalid storylet row (${row.slug}): ${validated.errors}`);
      return [];
    }
    return [validated.value];
  });
}

async function fetchDailyState(db: DB, userId: string): Promise<DailyState | null> {
  const { data } = await db
    .from("daily_states")
    .select(
      "id,user_id,day_index,energy,stress,vectors,life_pressure_state," +
        "energy_level,money_band,skill_flags,npc_memory,relationships," +
        "expired_opportunities,replay_intention,arc_one_reflection_done," +
        "preclusion_gates,start_date,last_day_completed,last_day_index_completed"
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data as DailyState | null) ?? null;
}

async function fetchAllRuns(db: DB, userId: string): Promise<StoryletRun[]> {
  const { data } = await db
    .from("storylet_runs")
    .select("id,user_id,storylet_id,day_index,choice_id,created_at")
    .eq("user_id", userId)
    .order("day_index", { ascending: true });
  return (data ?? []) as StoryletRun[];
}

// ─── State management ─────────────────────────────────────────────────────────

async function resetState(db: DB, userId: string, startDate: string) {
  const now = new Date().toISOString();
  const tables = [
    "storylet_runs", "reflections", "time_allocations",
    "daily_tensions", "player_day_state", "arc_instances",
    "arc_offers", "player_dispositions", "choice_log",
    "chapter_summaries", "user_anomalies",
  ];
  for (const table of tables) {
    await (db.from(table) as any).delete().eq("user_id", userId);
  }

  const initRelationships = ensureRelationshipDefaults(null).next;

  const { data: existing } = await db
    .from("daily_states")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const baseState = {
    day_index: 1,
    energy: 100,
    stress: 0,
    vectors: {},
    life_pressure_state: {},
    energy_level: "high",
    money_band: "okay",
    skill_flags: {},
    npc_memory: {},
    relationships: initRelationships,
    expired_opportunities: [],
    replay_intention: {},
    arc_one_reflection_done: false,
    preclusion_gates: [],
    start_date: startDate,
    last_day_completed: null,
    last_day_index_completed: null,
    updated_at: now,
  };

  if ((existing as any)?.id) {
    await db.from("daily_states").update(baseState).eq("user_id", userId);
  } else {
    await db.from("daily_states").insert({ user_id: userId, ...baseState });
  }

  // Seed player_day_state for Day 1 (legacy resource columns)
  await db.from("player_day_state").insert({
    user_id: userId,
    day_index: 1,
    energy: 100,
    stress: 0,
    study_progress: 0,
    money: 0,
    social_capital: 0,
    health: 50,
    updated_at: now,
  });
}

/**
 * Sets start_date so that computeDayIndex(start_date, today) === targetDay.
 * Formula: start_date = today - (targetDay - 1) days
 */
async function setDay(db: DB, userId: string, targetDay: number, today: string) {
  const startDate = shiftDate(today, -(targetDay - 1));
  await db
    .from("daily_states")
    .update({ start_date: startDate, day_index: targetDay, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

async function markDayComplete(db: DB, userId: string, dayIndex: number) {
  const now = new Date().toISOString();
  await db.from("time_allocations").upsert(
    {
      user_id: userId,
      day_index: dayIndex,
      allocation: { study: 2, work: 1, social: 2, health: 2, fun: 1 },
    },
    { onConflict: "user_id,day_index" }
  );
  await db.from("reflections").upsert(
    {
      user_id: userId,
      day_index: dayIndex,
      prompt_id: "clarity_v1",
      response: null,
      skipped: true,
      updated_at: now,
    },
    { onConflict: "user_id,day_index" }
  );
}

async function saveRun(
  db: DB,
  userId: string,
  storyletId: string,
  dayIndex: number,
  choiceId: string
) {
  await db.from("storylet_runs").insert({
    user_id: userId,
    storylet_id: storyletId,
    day_index: dayIndex,
    choice_id: choiceId,
  });
}

async function persistRelationships(
  db: DB,
  userId: string,
  relationships: Record<string, RelationshipState>
) {
  await db
    .from("daily_states")
    .update({ relationships, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

// ─── Log types ────────────────────────────────────────────────────────────────

interface ChoiceEntry {
  run: number;
  day: number;
  slot: number;
  storylet_slug: string;
  storylet_title: string;
  storylet_body_preview: string;
  choice_id: string;
  choice_label: string;
  reaction_text: string | null;
  identity_tags: string[];
  npc_events: Array<{ npc_id: string; type: string; magnitude?: number }>;
  precludes: string[];
  is_corrupted: boolean;
}

interface RunSummary {
  run: number;
  total_choices: number;
  unique_storylets: number;
  corrupted_slots: number;
  npcs_met: string[];
  final_relationships: Record<string, Pick<RelationshipState, "met" | "relationship" | "trust" | "reliability">>;
}

// ─── Simulate one day ─────────────────────────────────────────────────────────

async function simulateDay(
  db: DB,
  userId: string,
  dayIndex: number,
  seasonIndex: number,
  allStorylets: Storylet[],
  rand: () => number,
  runNumber: number,
  verbose: boolean,
  relationships: Record<string, RelationshipState>
): Promise<{ entries: ChoiceEntry[]; relationships: Record<string, RelationshipState> }> {
  const dailyState = await fetchDailyState(db, userId);
  const allRuns = await fetchAllRuns(db, userId);

  const seed = `sim:${userId}:run${runNumber}:day${dayIndex}`;
  const picked = selectStorylets({
    seed,
    userId,
    dayIndex,
    seasonIndex,
    dailyState,
    allStorylets,
    recentRuns: allRuns,
    isAdmin: true,
  });

  const entries: ChoiceEntry[] = [];
  let updatedRels = { ...relationships };

  for (let slot = 0; slot < picked.length; slot++) {
    const storylet = picked[slot];
    const isCorrupted = storylet.slug === "corrupted-storylet";

    // Pick a random non-fallback choice
    const choices = storylet.choices ?? [];
    const realChoices = choices.filter((c) => c.id !== "continue");
    const choice = pickRandom(realChoices.length > 0 ? realChoices : choices, rand);

    if (!isCorrupted) {
      await saveRun(db, userId, storylet.id, dayIndex, choice.id);
    }

    // Collect NPC events from this choice
    const eventsFromField = (choice.events_emitted ?? []) as Array<{
      npc_id: string;
      type: string;
      magnitude?: number;
    }>;
    const legacyRelEvents = choice.relational_effects
      ? mapLegacyRelationalEffects(choice.relational_effects)
      : [];
    const legacyKnowledge = choice.set_npc_memory
      ? mapLegacyNpcKnowledge(choice.set_npc_memory)
      : [];

    const allEvents = [
      ...eventsFromField.map((e) => ({
        npc_id: e.npc_id,
        type: e.type as any,
        magnitude: e.magnitude,
      })),
      ...legacyRelEvents,
      ...legacyKnowledge,
    ];

    // Apply NPC events in memory (persisted to DB at end of day)
    if (allEvents.length > 0) {
      const { next } = applyRelationshipEvents(updatedRels, allEvents, {
        storylet_slug: storylet.slug,
        choice_id: choice.id,
      });
      updatedRels = next;
    }

    // Console output
    const tag = isCorrupted ? "⚠ CORRUPTED" : ` Day ${String(dayIndex).padStart(2)} Slot ${slot + 1}`;
    console.log(`  ${tag}  ${storylet.slug.padEnd(32)} → ${choice.label}`);
    if (allEvents.length > 0) {
      const npcLine = allEvents
        .map((e) => `${e.npc_id.replace("npc_", "")}:${e.type}`)
        .join(", ");
      console.log(`            └─ 👤 ${npcLine}`);
    }
    if (verbose) {
      console.log(`            body: ${storylet.body.slice(0, 120)}…`);
      if (choice.reaction_text) {
        console.log(`            rxn:  ${choice.reaction_text}`);
      }
    }

    entries.push({
      run: runNumber,
      day: dayIndex,
      slot: slot + 1,
      storylet_slug: storylet.slug,
      storylet_title: storylet.title,
      storylet_body_preview: storylet.body.slice(0, 120),
      choice_id: choice.id,
      choice_label: choice.label,
      reaction_text: choice.reaction_text ?? null,
      identity_tags: choice.identity_tags ?? [],
      npc_events: allEvents.map((e) => ({ npc_id: e.npc_id, type: e.type, magnitude: e.magnitude })),
      precludes: choice.precludes ?? [],
      is_corrupted: isCorrupted,
    });
  }

  // Persist updated relationships once per day
  await persistRelationships(db, userId, updatedRels);

  return { entries, relationships: updatedRels };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { userId, runs, days, seed, verbose } = parseArgs();
  const db = makeAdminClient();
  const rand = makePrng(seed);
  const today = utcToday();

  // Fetch static data once
  const seasonIndex = await fetchCurrentSeasonIndex(db);
  const allStorylets = await fetchArcOneStorylets(db);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║               MMV Arc One Simulation                     ║
╚══════════════════════════════════════════════════════════╝
  User:     ${userId}
  Runs:     ${runs}
  Days:     ${days} per run
  Seed:     ${seed}
  Season:   ${seasonIndex}
  Pool:     ${allStorylets.length} active arc_one_core storylets
`);

  const allEntries: ChoiceEntry[] = [];
  const runSummaries: RunSummary[] = [];

  for (let runNum = 1; runNum <= runs; runNum++) {
    console.log(`\n── Run ${runNum} / ${runs} ${"─".repeat(50)}`);

    // Reset to a clean state
    await resetState(db, userId, shiftDate(today, -(days - 1)));

    let relationships = ensureRelationshipDefaults(null).next;
    const runEntries: ChoiceEntry[] = [];

    for (let day = 1; day <= days; day++) {
      console.log(`\n  ┌ Day ${day}`);
      await setDay(db, userId, day, today);

      const { entries, relationships: updatedRels } = await simulateDay(
        db,
        userId,
        day,
        seasonIndex,
        allStorylets,
        rand,
        runNum,
        verbose,
        relationships
      );

      relationships = updatedRels;
      runEntries.push(...entries);

      await markDayComplete(db, userId, day);
    }

    allEntries.push(...runEntries);

    // Build run summary
    const uniqueStorylets = new Set(runEntries.map((e) => e.storylet_slug)).size;
    const corruptedSlots = runEntries.filter((e) => e.is_corrupted).length;
    const npcsMet = Object.entries(relationships)
      .filter(([, r]) => r.met)
      .map(([id]) => id.replace("npc_", ""));
    const finalRels = Object.fromEntries(
      Object.entries(relationships).map(([id, r]) => [
        id,
        {
          met: r.met,
          relationship: r.relationship,
          trust: r.trust,
          reliability: r.reliability,
        },
      ])
    );

    const summary: RunSummary = {
      run: runNum,
      total_choices: runEntries.length,
      unique_storylets: uniqueStorylets,
      corrupted_slots: corruptedSlots,
      npcs_met: npcsMet,
      final_relationships: finalRels,
    };
    runSummaries.push(summary);

    const corruptedNote = corruptedSlots > 0 ? ` ⚠ ${corruptedSlots} corrupted slot(s)` : "";
    console.log(
      `\n  ✓ Run ${runNum}: ${runEntries.length} choices, ` +
        `${uniqueStorylets} unique storylets, ` +
        `NPCs met: [${npcsMet.join(", ")}]${corruptedNote}`
    );

    // Per-run NPC relationship table
    console.log(`\n  NPC relationships at end of run ${runNum}:`);
    for (const [npcId, r] of Object.entries(relationships)) {
      const name = npcId.replace("npc_", "").padEnd(20);
      const metFlag = r.met ? "✓met" : "    ";
      console.log(
        `    ${name} ${metFlag}  rel=${String(r.relationship).padStart(2)}  ` +
          `trust=${String(r.trust).padStart(5)}  reliability=${String(r.reliability).padStart(5)}`
      );
    }
  }

  // ─── Write JSON log ──────────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = resolve(process.cwd(), `sim-log-${timestamp}.json`);
  writeFileSync(
    logPath,
    JSON.stringify({ args: { userId, runs, days, seed }, summaries: runSummaries, entries: allEntries }, null, 2),
    "utf-8"
  );

  // ─── Final summary ──────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(62)}`);
  console.log(`  Simulation complete`);
  console.log(`  Total choices logged: ${allEntries.length}`);
  if (runSummaries.some((s) => s.corrupted_slots > 0)) {
    const total = runSummaries.reduce((n, s) => n + s.corrupted_slots, 0);
    console.log(`  ⚠  Corrupted slots detected: ${total} (see log for days/runs)`);
  } else {
    console.log(`  ✓  No corrupted slots detected`);
  }
  console.log(`  Log written to: ${logPath}`);
  console.log(`${"═".repeat(62)}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Simulation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
