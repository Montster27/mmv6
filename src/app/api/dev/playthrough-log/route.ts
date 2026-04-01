import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/dev/playthrough-log
 *
 * Returns the current playthrough log as plain markdown text.
 * Data lives in the playthrough_log Supabase table (one row per user).
 * Entries are appended on every storylet resolve; reset when day_index = 0.
 *
 * Dev only — no strict auth.
 */
export async function GET() {
  // Read all log rows (dev: one per user, usually just one)
  const { data: rows, error } = await supabaseServer
    .from("playthrough_log")
    .select("user_id, entries, started_at, updated_at")
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return new Response("# Latest Playthrough\n\n_(no entries yet — play through a storylet first)_\n", {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  // Use the most recently started session
  const log = rows[0];
  const entries = (log.entries as Array<{
    n: number;
    title: string;
    track: string;
    day: number;
    segment: string | null;
    choice: string;
    ts: string;
  }>) ?? [];

  const lines: string[] = [
    "# Latest Playthrough",
    `Generated: ${new Date().toISOString()}`,
    `Started:   ${log.started_at}`,
    "",
  ];

  for (const e of entries) {
    const meta = [
      e.track,
      `Day ${e.day}${e.segment ? ` ${e.segment}` : ""}`,
    ].join(", ");
    lines.push(`${e.n}. **${e.title}** (${meta})`);
    lines.push(`   → Choice: "${e.choice}"`);
    lines.push(`   _${e.ts}_`);
    lines.push("");
  }

  const markdown = lines.join("\n");

  return new Response(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
