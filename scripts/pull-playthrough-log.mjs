#!/usr/bin/env node
/**
 * pull-playthrough-log.mjs
 *
 * Fetches the latest playthrough log from Supabase and writes it to
 * docs/PLAYTHROUGH-LOG.md for local review.
 *
 * Usage: npm run log
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load .env.local
try {
  const env = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local not found — rely on shell env
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: rows, error } = await supabase
  .from("playthrough_log")
  .select("user_id, entries, started_at, updated_at")
  .order("updated_at", { ascending: false });

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

if (!rows || rows.length === 0) {
  console.log("No playthrough log entries found.");
  process.exit(0);
}

const log = rows[0];
const entries = log.entries ?? [];

const lines = [
  "# Latest Playthrough",
  `Generated: ${new Date().toISOString()}`,
  `Started:   ${log.started_at}`,
  `Updated:   ${log.updated_at}`,
  "",
];

for (const e of entries) {
  const meta = [e.track, `Day ${e.day}${e.segment ? ` ${e.segment}` : ""}`].join(", ");
  lines.push(`${e.n}. **${e.title}** (${meta})`);
  lines.push(`   → Choice: "${e.choice}"`);
  lines.push(`   _${e.ts}_`);
  lines.push("");
}

const out = join(root, "docs", "PLAYTHROUGH-LOG.md");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Written ${entries.length} entries → docs/PLAYTHROUGH-LOG.md`);
