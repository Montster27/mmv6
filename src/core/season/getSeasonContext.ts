import { supabase } from "@/lib/supabase/browser";
import { getOrCreateUserSeason } from "@/lib/seasons";
import type { SeasonContext, Season } from "@/types/season";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toUtcDateString(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function computeDaysRemaining(endsAt: string, todayStr: string): number {
  const end = toUtcDate(endsAt).getTime();
  const today = toUtcDate(todayStr).getTime();
  if (end <= today) return 0;
  return Math.max(0, Math.ceil((end - today) / MS_PER_DAY));
}

async function fetchSeasonForDate(todayStr: string): Promise<Season | null> {
  const { data, error } = await supabase
    .from("seasons")
    .select("season_index,starts_at,ends_at")
    .lte("starts_at", todayStr)
    .gte("ends_at", todayStr)
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle<Season>();

  if (error) {
    console.error("Failed to fetch current season", error);
  }

  if (data) return data;

  const fallback = await supabase
    .from("seasons")
    .select("season_index,starts_at,ends_at")
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle<Season>();

  if (fallback.error) {
    console.error("Failed to fetch fallback season", fallback.error);
  }

  return fallback.data ?? null;
}

export async function getSeasonContext(
  userId: string,
  today: Date
): Promise<SeasonContext> {
  const todayStr = toUtcDateString(today);
  let currentSeason = await fetchSeasonForDate(todayStr);

  if (!currentSeason) {
    currentSeason = {
      season_index: 1,
      starts_at: todayStr,
      ends_at: todayStr,
    };
  }

  const userSeason = await getOrCreateUserSeason(
    userId,
    currentSeason.season_index
  );

  return {
    currentSeason,
    daysRemaining: computeDaysRemaining(currentSeason.ends_at, todayStr),
    userSeason,
  };
}

export const _testOnly = { computeDaysRemaining, toUtcDateString };
