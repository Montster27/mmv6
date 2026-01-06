import { supabase } from "@/lib/supabaseClient";
import type { PublicProfile, ReceivedBoost } from "@/types/social";

export type { PublicProfile, ReceivedBoost } from "@/types/social";

export async function fetchPublicProfiles(
  excludeUserId: string
): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("user_id,display_name,created_at")
    .neq("user_id", excludeUserId)
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("Failed to fetch public profiles", error);
    return [];
  }

  return data ?? [];
}

export async function fetchTodayReceivedBoosts(
  userId: string,
  dayIndex: number
): Promise<ReceivedBoost[]> {
  const { data, error } = await supabase
    .from("social_actions")
    .select("from_user_id,created_at,payload")
    .eq("to_user_id", userId)
    .eq("action_type", "boost")
    .eq("payload->>day_index", dayIndex.toString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch received boosts", error);
    return [];
  }

  return (
    data?.map((row) => ({
      from_user_id: row.from_user_id,
      created_at: row.created_at,
    })) ?? []
  );
}

export async function hasSentBoostToday(
  userId: string,
  dayIndex: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("social_actions")
    .select("id")
    .eq("from_user_id", userId)
    .eq("action_type", "boost")
    .eq("payload->>day_index", dayIndex.toString())
    .limit(1);

  if (error) {
    console.error("Failed to check boost status", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export async function sendBoost(
  fromUserId: string,
  toUserId: string,
  dayIndex: number
): Promise<void> {
  const alreadySent = await hasSentBoostToday(fromUserId, dayIndex);
  if (alreadySent) {
    throw new Error("Boost already sent for today.");
  }

  const { error } = await supabase.from("social_actions").insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    action_type: "boost",
    payload: { day_index: dayIndex },
  });

  if (error) {
    console.error("Failed to send boost", error);
    throw error;
  }
}
