import { supabase } from "@/lib/supabaseClient";
import type { DailyState } from "@/types/daily";

export function utcToday(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

export function computeDayIndex(startDate: string, today: string): number {
  const start = new Date(startDate + "T00:00:00Z");
  const curr = new Date(today + "T00:00:00Z");
  const diffMs = curr.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return 1 + Math.max(diffDays, 0);
}

export async function ensureCadenceUpToDate(userId: string): Promise<{
  dayIndex: number;
  alreadyCompletedToday: boolean;
}> {
  const today = utcToday();
  const { data: daily, error } = await supabase
    .from("daily_states")
    .select(
      "id,user_id,day_index,energy,stress,vectors,start_date,last_day_completed,last_day_index_completed"
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<DailyState>();

  if (error) {
    console.error("Failed to fetch daily state for cadence", error);
    throw new Error("Unable to load daily state.");
  }

  if (!daily) {
    throw new Error("No daily state found for user.");
  }

  const startDate = daily.start_date ?? today;
  const expectedDayIndex = computeDayIndex(startDate, today);

  let alreadyCompletedToday =
    daily.last_day_completed === today &&
    daily.last_day_index_completed === daily.day_index;

  if (expectedDayIndex > daily.day_index) {
    const { error } = await supabase
      .from("daily_states")
      .update({
        day_index: expectedDayIndex,
        energy: 100,
        stress: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", daily.id);

    if (error) {
      console.error("Failed to update day index", error);
    }
    alreadyCompletedToday = false;
    return { dayIndex: expectedDayIndex, alreadyCompletedToday };
  }

  return { dayIndex: daily.day_index, alreadyCompletedToday };
}
