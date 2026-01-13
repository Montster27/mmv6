import { supabase } from "@/lib/supabase/browser";

export type FunPulseRow = {
  id: string;
  user_id: string;
  season_index: number;
  day_index: number;
  rating: number | null;
  skipped: boolean;
  created_at: string;
};

export async function getFunPulse(
  userId: string,
  seasonIndex: number,
  dayIndex: number
): Promise<FunPulseRow | null> {
  const { data, error } = await supabase
    .from("fun_pulses")
    .select("id,user_id,season_index,day_index,rating,skipped,created_at")
    .eq("user_id", userId)
    .eq("season_index", seasonIndex)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load fun pulse", error);
    return null;
  }

  return data ?? null;
}

export async function upsertFunPulse(payload: {
  userId: string;
  seasonIndex: number;
  dayIndex: number;
  rating?: number | null;
  skipped?: boolean;
}) {
  const { error } = await supabase
    .from("fun_pulses")
    .upsert(
      {
        user_id: payload.userId,
        season_index: payload.seasonIndex,
        day_index: payload.dayIndex,
        rating: payload.rating ?? null,
        skipped: payload.skipped ?? false,
      },
      { onConflict: "user_id,season_index,day_index" }
    );

  if (error) {
    console.error("Failed to save fun pulse", error);
    throw error;
  }
}
