import { supabase } from "@/lib/supabase/browser";
import type { FactionKey } from "@/types/factions";

export function computeWeekWindow(dayIndex: number) {
  const weekStart = dayIndex - (dayIndex % 7);
  const weekEnd = weekStart + 6;
  return { weekStart, weekEnd };
}

function normalizeInfluence(
  rows: Array<{ faction_key: string | null; delta: number | null }>
): Record<string, number> {
  const influence: Record<string, number> = {};
  rows.forEach((row) => {
    if (!row.faction_key) return;
    const delta = typeof row.delta === "number" ? row.delta : 0;
    influence[row.faction_key] = (influence[row.faction_key] ?? 0) + delta;
  });
  return influence;
}

export async function getOrComputeWorldWeeklyInfluence(
  weekStart: number,
  weekEnd: number
): Promise<Record<string, number>> {
  const { data: existing, error: existingError } = await supabase
    .from("world_state_weekly")
    .select("week_start_day_index,week_end_day_index,influence")
    .eq("week_start_day_index", weekStart)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch world state", existingError);
    throw new Error("Failed to fetch world state.");
  }

  if (existing) {
    return (existing.influence as Record<string, number>) ?? {};
  }

  const { data: events, error: eventsError } = await supabase
    .from("alignment_events")
    .select("faction_key,delta")
    .gte("day_index", weekStart)
    .lte("day_index", weekEnd);

  if (eventsError) {
    console.error("Failed to load alignment events", eventsError);
    throw new Error("Failed to load alignment events.");
  }

  const influence = normalizeInfluence(events ?? []);

  const { error: insertError } = await supabase.from("world_state_weekly").insert({
    week_start_day_index: weekStart,
    week_end_day_index: weekEnd,
    influence,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry } = await supabase
        .from("world_state_weekly")
        .select("influence")
        .eq("week_start_day_index", weekStart)
        .limit(1)
        .maybeSingle();
      return (retry?.influence as Record<string, number>) ?? influence;
    }
    console.error("Failed to create world state", insertError);
    throw new Error("Failed to create world state.");
  }

  return influence;
}

export async function getOrComputeCohortWeeklyInfluence(
  cohortId: string,
  weekStart: number,
  weekEnd: number
): Promise<Record<string, number>> {
  const { data: existing, error: existingError } = await supabase
    .from("cohort_alignment_weekly")
    .select("cohort_id,week_start_day_index,week_end_day_index,influence")
    .eq("cohort_id", cohortId)
    .eq("week_start_day_index", weekStart)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch cohort influence", existingError);
    throw new Error("Failed to fetch cohort influence.");
  }

  if (existing) {
    return (existing.influence as Record<string, number>) ?? {};
  }

  const { data: members, error: membersError } = await supabase
    .from("cohort_members")
    .select("user_id")
    .eq("cohort_id", cohortId);

  if (membersError) {
    console.error("Failed to load cohort members", membersError);
    throw new Error("Failed to load cohort members.");
  }

  const userIds = (members ?? []).map((row) => row.user_id).filter(Boolean);
  if (userIds.length === 0) {
    const emptyInfluence = {} as Record<string, number>;
    await supabase.from("cohort_alignment_weekly").insert({
      cohort_id: cohortId,
      week_start_day_index: weekStart,
      week_end_day_index: weekEnd,
      influence: emptyInfluence,
    });
    return emptyInfluence;
  }

  const { data: events, error: eventsError } = await supabase
    .from("alignment_events")
    .select("faction_key,delta")
    .in("user_id", userIds)
    .gte("day_index", weekStart)
    .lte("day_index", weekEnd);

  if (eventsError) {
    console.error("Failed to load cohort alignment events", eventsError);
    throw new Error("Failed to load cohort alignment events.");
  }

  const influence = normalizeInfluence(events ?? []);

  const { error: insertError } = await supabase.from("cohort_alignment_weekly").insert({
    cohort_id: cohortId,
    week_start_day_index: weekStart,
    week_end_day_index: weekEnd,
    influence,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry } = await supabase
        .from("cohort_alignment_weekly")
        .select("influence")
        .eq("cohort_id", cohortId)
        .eq("week_start_day_index", weekStart)
        .limit(1)
        .maybeSingle();
      return (retry?.influence as Record<string, number>) ?? influence;
    }
    console.error("Failed to create cohort influence", insertError);
    throw new Error("Failed to create cohort influence.");
  }

  return influence;
}

export async function getOrComputeWeeklySnapshot(
  weekStart: number,
  weekEnd: number
): Promise<{ topCohorts: Array<{ cohort_id: string; faction_key: string; score: number }> }> {
  const { data: existing, error: existingError } = await supabase
    .from("weekly_competition_snapshot")
    .select("week_start_day_index,top_cohorts")
    .eq("week_start_day_index", weekStart)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch weekly snapshot", existingError);
    throw new Error("Failed to fetch weekly snapshot.");
  }

  if (existing) {
    return { topCohorts: (existing.top_cohorts as any[]) ?? [] };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("cohort_alignment_weekly")
    .select("cohort_id,influence")
    .eq("week_start_day_index", weekStart);

  if (rowsError) {
    console.error("Failed to load cohort alignment rows", rowsError);
    throw new Error("Failed to load cohort alignment rows.");
  }

  const scored = (rows ?? []).map((row) => {
    const influence = (row.influence as Record<string, number>) ?? {};
    let bestFaction: FactionKey = "neo_assyrian";
    let bestScore = Number.NEGATIVE_INFINITY;
    (Object.keys(influence) as FactionKey[]).forEach((key) => {
      const score = influence[key] ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestFaction = key;
      }
    });
    if (!Number.isFinite(bestScore)) {
      bestScore = 0;
      bestFaction = "neo_assyrian";
    }
    return { cohort_id: row.cohort_id as string, faction_key: bestFaction, score: bestScore };
  });

  const topCohorts = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const { error: insertError } = await supabase
    .from("weekly_competition_snapshot")
    .insert({
      week_start_day_index: weekStart,
      top_cohorts: topCohorts,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry } = await supabase
        .from("weekly_competition_snapshot")
        .select("top_cohorts")
        .eq("week_start_day_index", weekStart)
        .limit(1)
        .maybeSingle();
      return { topCohorts: (retry?.top_cohorts as any[]) ?? topCohorts };
    }
    console.error("Failed to create weekly snapshot", insertError);
    throw new Error("Failed to create weekly snapshot.");
  }

  return { topCohorts };
}
