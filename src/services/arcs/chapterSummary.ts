import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

type SummaryCounts = {
  completed: number;
  abandoned: number;
  deferred: number;
};

type PillarSummary = {
  totals: SummaryCounts;
  tags: Record<string, SummaryCounts>;
};

function emptyCounts(): SummaryCounts {
  return { completed: 0, abandoned: 0, deferred: 0 };
}

function increment(target: SummaryCounts, key: keyof SummaryCounts) {
  target[key] += 1;
}

export async function computeChapterSummary(
  userId: string,
  chapterKey: string,
  dayEnd: number
): Promise<PillarSummary> {
  const { data: arcs, error: arcError } = await supabaseServer
    .from("arc_definitions")
    .select("id,tags");
  if (arcError) {
    console.error("Failed to load arc definitions", arcError);
    throw new Error("Failed to load arc definitions.");
  }

  const arcTags = new Map<string, string[]>();
  (arcs ?? []).forEach((arc) => {
    arcTags.set(arc.id, (arc.tags ?? []) as string[]);
  });

  const { data: logs, error: logError } = await supabaseServer
    .from("choice_log")
    .select("event_type,arc_id")
    .eq("user_id", userId)
    .lte("day", dayEnd)
    .in("event_type", ["ARC_COMPLETED", "ARC_ABANDONED", "STEP_DEFERRED"]);
  if (logError) {
    console.error("Failed to load choice logs", logError);
    throw new Error("Failed to load choice logs.");
  }

  const summary: PillarSummary = {
    totals: emptyCounts(),
    tags: {},
  };

  (logs ?? []).forEach((entry) => {
    const eventType = entry.event_type as string;
    const tags = arcTags.get(entry.arc_id ?? "") ?? [];
    const bucket =
      eventType === "ARC_COMPLETED"
        ? "completed"
        : eventType === "ARC_ABANDONED"
        ? "abandoned"
        : "deferred";

    increment(summary.totals, bucket);
    tags.forEach((tag) => {
      if (!summary.tags[tag]) summary.tags[tag] = emptyCounts();
      increment(summary.tags[tag], bucket);
    });
  });

  const { error: insertError } = await supabaseServer
    .from("chapter_summaries")
    .insert({
      user_id: userId,
      chapter_key: chapterKey,
      day_end: dayEnd,
      pillar_summary: summary,
    });
  if (insertError) {
    console.error("Failed to store chapter summary", insertError);
    throw new Error("Failed to store chapter summary.");
  }

  return summary;
}
