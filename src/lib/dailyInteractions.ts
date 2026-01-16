import { supabase } from "@/lib/supabase/browser";
import type { DailyPosture, DailyTension, SkillBank } from "@/types/dailyInteraction";

export type { DailyPosture, DailyTension, SkillBank } from "@/types/dailyInteraction";

export async function fetchTensions(
  userId: string,
  dayIndex: number
): Promise<DailyTension[]> {
  const { data, error } = await supabase
    .from("daily_tensions")
    .select("user_id,day_index,key,severity,expires_day_index,resolved_at,meta")
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to fetch daily tensions", error);
    return [];
  }

  return data ?? [];
}

export async function upsertTension(tension: DailyTension): Promise<void> {
  const { error } = await supabase.from("daily_tensions").upsert(tension, {
    onConflict: "user_id,day_index,key",
  });

  if (error) {
    console.error("Failed to upsert daily tension", error);
    throw error;
  }
}

export async function fetchSkillBank(userId: string): Promise<SkillBank | null> {
  const { data, error } = await supabase
    .from("skill_bank")
    .select("user_id,available_points,cap,last_awarded_day_index")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch skill bank", error);
    return null;
  }

  return data ?? null;
}

export async function upsertSkillBank(skillBank: SkillBank): Promise<void> {
  const { error } = await supabase.from("skill_bank").upsert(skillBank, {
    onConflict: "user_id",
  });

  if (error) {
    console.error("Failed to upsert skill bank", error);
    throw error;
  }
}

export async function fetchPosture(
  userId: string,
  dayIndex: number
): Promise<DailyPosture | null> {
  const { data, error } = await supabase
    .from("daily_posture")
    .select("user_id,day_index,posture,created_at")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch daily posture", error);
    return null;
  }

  return data ?? null;
}

export async function upsertPosture(posture: DailyPosture): Promise<void> {
  const { error } = await supabase.from("daily_posture").upsert(posture, {
    onConflict: "user_id,day_index",
  });

  if (error) {
    console.error("Failed to upsert daily posture", error);
    throw error;
  }
}
