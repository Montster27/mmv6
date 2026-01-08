import { supabase } from "@/lib/supabaseClient";
import type { Season, UserSeason } from "@/types/seasons";

const userSeasonSelect =
  "id,user_id,current_season_index,last_seen_season_index,last_reset_at,last_recap,created_at,updated_at";

export async function fetchCurrentSeasonIndex(today: string): Promise<number> {
  const { data, error } = await supabase
    .from("seasons")
    .select("season_index,starts_at,ends_at")
    .lte("starts_at", today)
    .gte("ends_at", today)
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle<Season>();

  if (error) {
    console.error("Failed to fetch current season", error);
    return 1;
  }

  if (!data?.season_index) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("No season found for today, defaulting to season 1.");
    }
    return 1;
  }

  return data.season_index;
}

export async function getOrCreateUserSeason(
  userId: string,
  currentSeasonIndex: number
): Promise<UserSeason> {
  const { data, error } = await supabase
    .from("user_seasons")
    .select(userSeasonSelect)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<UserSeason>();

  if (error) {
    console.error("Failed to fetch user season", error);
    throw new Error("Unable to load user season.");
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from("user_seasons")
    .insert({
      user_id: userId,
      current_season_index: currentSeasonIndex,
      last_seen_season_index: currentSeasonIndex,
      updated_at: new Date().toISOString(),
    })
    .select(userSeasonSelect)
    .maybeSingle<UserSeason>();

  if (createError || !created) {
    console.error("Failed to create user season", createError);
    throw new Error("Unable to initialize user season.");
  }

  return created;
}

export async function updateUserSeason(
  userId: string,
  patch: Partial<UserSeason>
): Promise<UserSeason | null> {
  const { data, error } = await supabase
    .from("user_seasons")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select(userSeasonSelect)
    .maybeSingle<UserSeason>();

  if (error) {
    console.error("Failed to update user season", error);
    return null;
  }

  return data ?? null;
}
