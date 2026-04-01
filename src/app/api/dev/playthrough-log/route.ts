import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/dev/playthrough-log
 *
 * Reads all resolved storylets from choice_log, enriches with titles and
 * choice labels, and writes docs/PLAYTHROUGH-LOG.md (overwriting each time).
 *
 * Dev only — no auth, no prod usage.
 */
export async function GET() {
  // 1. Load all resolved storylet events, ordered chronologically
  const { data: logRows, error: logErr } = await supabaseServer
    .from("choice_log")
    .select("id, day, step_key, option_key, track_id, created_at")
    .eq("event_type", "STORYLET_RESOLVED")
    .order("created_at", { ascending: true });

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  if (!logRows || logRows.length === 0) {
    return NextResponse.json({ ok: true, lines: 0, message: "No resolved storylets yet." });
  }

  // 2. Collect unique track IDs and storylet keys for batch lookup
  const trackIds = [...new Set(logRows.map((r) => r.track_id).filter(Boolean))];
  const stepKeys = [...new Set(logRows.map((r) => r.step_key).filter(Boolean))];

  // 3. Fetch tracks (for name)
  const { data: tracks } = await supabaseServer
    .from("tracks")
    .select("id, key, name")
    .in("id", trackIds);

  const trackById = new Map(
    (tracks ?? []).map((t) => [t.id, t])
  );

  // 4. Fetch storylets (for title, segment, choices JSON)
  const { data: storylets } = await supabaseServer
    .from("storylets")
    .select("track_id, storylet_key, title, segment, choices")
    .in("track_id", trackIds)
    .in("storylet_key", stepKeys);

  // Index by "track_id:storylet_key"
  const storyletByKey = new Map(
    (storylets ?? []).map((s) => [`${s.track_id}:${s.storylet_key}`, s])
  );

  // 5. Build markdown lines
  const lines: string[] = [];

  for (let i = 0; i < logRows.length; i++) {
    const row = logRows[i];
    const track = trackById.get(row.track_id);
    const storylet = storyletByKey.get(`${row.track_id}:${row.step_key}`);

    const title = storylet?.title ?? row.step_key ?? "Unknown";
    const trackName = track?.key ?? "unknown";
    const segment = storylet?.segment ?? null;
    const dayNum = row.day ?? 0;

    // Find the chosen option label
    let choiceLabel = row.option_key;
    const choices = Array.isArray(storylet?.choices) ? storylet.choices : [];
    const match = choices.find(
      (c: Record<string, unknown>) =>
        c.id === row.option_key || c.option_key === row.option_key
    );
    if (match && typeof match.label === "string") {
      choiceLabel = match.label;
    }

    const meta = [
      `${trackName}`,
      `Day ${dayNum}${segment ? ` ${segment}` : ""}`,
    ].join(", ");

    lines.push(`${i + 1}. **${title}** (${meta})`);
    lines.push(`   → Choice: "${choiceLabel}"`);
    lines.push("");
  }

  // 6. Assemble markdown
  const timestamp = new Date().toISOString();
  const markdown = [
    "# Latest Playthrough",
    `Generated: ${timestamp}`,
    "",
    ...lines,
  ].join("\n");

  // 7. Write to docs/PLAYTHROUGH-LOG.md
  const outputPath = join(process.cwd(), "docs", "PLAYTHROUGH-LOG.md");
  writeFileSync(outputPath, markdown, "utf8");

  return NextResponse.json({
    ok: true,
    lines: logRows.length,
    path: "docs/PLAYTHROUGH-LOG.md",
    generated: timestamp,
  });
}
