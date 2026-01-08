import { supabase } from "@/lib/supabaseClient";
import { utcToday } from "@/lib/cadence";
import { trackEvent } from "@/lib/events";
import type { DailyState } from "@/types/daily";
import type { Season, SeasonRecap, UserSeason } from "@/types/seasons";

type ResetPayload = {
  day_index: number;
  energy: number;
  stress: number;
  vectors: Record<string, number>;
  start_date: string;
  last_day_completed: null;
  last_day_index_completed: null;
  updated_at: string;
};

function toDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function pickSeasonIndex(seasons: Season[], today: string): number | null {
  const todayDate = toDate(today);
  const candidates = seasons.filter((season) => {
    const start = toDate(season.starts_at);
    const end = toDate(season.ends_at);
    return todayDate >= start && todayDate <= end;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.season_index - a.season_index);
  return candidates[0].season_index;
}

function buildResetPayload(today: string): ResetPayload {
  return {
    day_index: 0,
    energy: 100,
    stress: 0,
    vectors: {},
    start_date: today,
    last_day_completed: null,
    last_day_index_completed: null,
    updated_at: new Date().toISOString(),
  };
}

function pickTopVector(vectors: DailyState["vectors"]): string | null {
  if (!vectors || typeof vectors !== "object" || Array.isArray(vectors)) {
    return null;
  }
  let topKey: string | null = null;
  let topValue = -Infinity;
  Object.entries(vectors).forEach(([key, value]) => {
    if (typeof value !== "number") return;
    if (value > topValue) {
      topValue = value;
      topKey = key;
    }
  });
  return topKey;
}

async function countRows(
  table: string,
  userId: string,
  since?: string | null
): Promise<number> {
  let query = supabase.from(table).select("id").eq("user_id", userId);
  if (since) {
    query = query.gte("created_at", since);
  }
  const { data, error } = await query;
  if (error) {
    console.error(`Failed to count ${table}`, error);
    return 0;
  }
  return data?.length ?? 0;
}

async function countUserAnomalies(userId: string, since?: string | null): Promise<number> {
  let query = supabase
    .from("user_anomalies")
    .select("anomaly_id")
    .eq("user_id", userId);
  if (since) {
    query = query.gte("discovered_at", since);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Failed to count user anomalies", error);
    return 0;
  }
  return data?.length ?? 0;
}

export async function performSeasonReset(
  userId: string,
  newSeasonIndex: number,
  userSeason: UserSeason
): Promise<SeasonRecap> {
  if (
    userSeason.current_season_index === newSeasonIndex &&
    userSeason.last_reset_at
  ) {
    const recap =
      (userSeason.last_recap as SeasonRecap | null) ?? {
        lastSeasonIndex: newSeasonIndex - 1,
        anomaliesFoundCount: 0,
        hypothesesCount: 0,
      };
    return recap;
  }

  const { data: daily, error: dailyError } = await supabase
    .from("daily_states")
    .select(
      "id,user_id,day_index,energy,stress,vectors,start_date,last_day_completed,last_day_index_completed"
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<DailyState>();

  if (dailyError) {
    console.error("Failed to load daily state for reset", dailyError);
  }

  const lastResetAt = userSeason.last_reset_at ?? null;
  const anomaliesFoundCount = await countUserAnomalies(userId, lastResetAt);
  const hypothesesCount = await countRows("hypotheses", userId, lastResetAt);
  const topVector = daily ? pickTopVector(daily.vectors) : null;

  const recap: SeasonRecap = {
    lastSeasonIndex: userSeason.current_season_index,
    anomaliesFoundCount,
    hypothesesCount,
    topVector,
  };

  const today = utcToday();
  const resetPayload = buildResetPayload(today);

  const { error: resetError } = await supabase
    .from("daily_states")
    .update(resetPayload)
    .eq("user_id", userId);

  if (resetError) {
    console.error("Failed to reset daily state", resetError);
  }

  const { error: seasonError } = await supabase
    .from("user_seasons")
    .update({
      current_season_index: newSeasonIndex,
      last_seen_season_index: newSeasonIndex,
      last_reset_at: new Date().toISOString(),
      last_recap: recap,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (seasonError) {
    console.error("Failed to update user season", seasonError);
  }

  trackEvent({
    event_type: "season_started",
    payload: { season_index: newSeasonIndex },
  });
  trackEvent({
    event_type: "season_reset_completed",
    payload: { season_index: newSeasonIndex, recap },
  });

  return recap;
}

export const _testOnly = {
  pickSeasonIndex,
  buildResetPayload,
};
