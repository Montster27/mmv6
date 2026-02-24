import { supabaseServer } from "@/lib/supabase/server";

export async function getCurrentDayIndex(userId: string): Promise<number> {
  const { data, error } = await supabaseServer
    .from("daily_states")
    .select("day_index")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data || typeof data.day_index !== "number") {
    throw new Error("Daily state not found.");
  }

  return data.day_index;
}
