import { supabase } from "@/lib/supabase/browser";
import { FACTION_KEYS } from "@/lib/factions";
import type { FactionDirective, FactionKey } from "@/types/factions";

const DIRECTIVE_COPY: Record<FactionKey, { title: string; description: string }> = {
  neo_assyrian: {
    title: "Secure the signal chain",
    description: "Document the inconsistency, map who profits, and keep it clean.",
  },
  dynastic_consortium: {
    title: "Archive the evidence",
    description: "Collect fragments that can be cited later, without fanfare.",
  },
  templar_remnant: {
    title: "Commit to the watch",
    description: "Show discipline. Repeat the practice until it becomes habit.",
  },
  bormann_network: {
    title: "Contain the anomaly",
    description: "Keep it quiet. Better to bury it than to brandish it.",
  },
};

export async function getOrCreateWeeklyDirective(
  cohortId: string,
  weekStartDayIndex: number,
  weekEndDayIndex: number
): Promise<FactionDirective> {
  const { data: existing, error: existingError } = await supabase
    .from("faction_directives")
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .eq("cohort_id", cohortId)
    .eq("week_start_day_index", weekStartDayIndex)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch faction directive", existingError);
    throw new Error("Failed to fetch faction directive.");
  }

  if (existing) return existing;

  const factionKey =
    FACTION_KEYS[Math.abs(weekStartDayIndex) % FACTION_KEYS.length];
  const copy = DIRECTIVE_COPY[factionKey];

  const { data: created, error: createError } = await supabase
    .from("faction_directives")
    .insert({
      cohort_id: cohortId,
      faction_key: factionKey,
      week_start_day_index: weekStartDayIndex,
      week_end_day_index: weekEndDayIndex,
      title: copy.title,
      description: copy.description,
      target_type: "initiative",
      target_key: "campus_signal_watch",
      status: "active",
    })
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .limit(1)
    .maybeSingle();

  if (createError) {
    const { data: retry } = await supabase
      .from("faction_directives")
      .select(
        "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
      )
      .eq("cohort_id", cohortId)
      .eq("week_start_day_index", weekStartDayIndex)
      .limit(1)
      .maybeSingle();
    if (retry) return retry;
    console.error("Failed to create faction directive", createError);
    throw new Error("Failed to create faction directive.");
  }

  if (!created) {
    throw new Error("Failed to create faction directive.");
  }

  return created;
}

export async function fetchActiveDirectiveForCohort(
  cohortId: string,
  dayIndex: number
): Promise<FactionDirective | null> {
  const { data, error } = await supabase
    .from("faction_directives")
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .eq("cohort_id", cohortId)
    .eq("status", "active")
    .lte("week_start_day_index", dayIndex)
    .gte("week_end_day_index", dayIndex)
    .order("week_start_day_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active directive", error);
    throw new Error("Failed to fetch active directive.");
  }

  return data ?? null;
}
