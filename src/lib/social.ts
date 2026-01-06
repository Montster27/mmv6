import { supabase } from "@/lib/supabaseClient";
import type { PublicProfile, ReceivedBoost } from "@/types/social";
import type { DailyState } from "@/types/daily";

export type { PublicProfile, ReceivedBoost } from "@/types/social";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

async function fetchDailyState(userId: string): Promise<DailyState | null> {
  const { data, error } = await supabase
    .from("daily_states")
    .select("id,user_id,day_index,energy,stress,vectors")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch daily state for boosts", error);
    return null;
  }
  return data ?? null;
}

async function updateDailyStateValues(
  userId: string,
  next: Pick<DailyState, "energy" | "stress" | "vectors">
) {
  const { error } = await supabase
    .from("daily_states")
    .update({
      energy: next.energy,
      stress: next.stress,
      vectors: next.vectors,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update daily state for boosts", error);
  }
}

function toVectors(raw: DailyState["vectors"]) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return Object.entries(raw).reduce<Record<string, number>>((acc, [k, v]) => {
      if (typeof v === "number") acc[k] = v;
      return acc;
    }, {});
  }
  return {};
}

async function getExistingBoost(
  fromUserId: string,
  dayValue: string
): Promise<{ id: string; payload: any } | null> {
  const { data, error } = await supabase
    .from("social_actions")
    .select("id,payload")
    .eq("from_user_id", fromUserId)
    .eq("action_type", "boost")
    .eq("payload->>day_index", dayValue)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check boost status", error);
    return null;
  }
  return data ?? null;
}

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
  const dayValue = dayIndex.toString();
  const { data, error } = await supabase
    .from("social_actions")
    .select("id")
    .eq("from_user_id", userId)
    .eq("action_type", "boost")
    .eq("payload->>day_index", dayValue)
    .limit(1);

  if (error) {
    console.error("Failed to check boost status", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

async function applyBoostEffects(
  boostId: string,
  fromUserId: string,
  toUserId: string
) {
  const { data: boostRow, error: boostError } = await supabase
    .from("social_actions")
    .select("id,payload")
    .eq("id", boostId)
    .maybeSingle();

  if (boostError) {
    console.error("Failed to load boost row for effects", boostError);
    return;
  }

  const payload =
    boostRow?.payload && typeof boostRow.payload === "object"
      ? boostRow.payload
      : {};

  if ((payload as any).effects_applied) {
    return;
  }

  const senderState = await fetchDailyState(fromUserId);
  if (senderState) {
    const vectors = toVectors(senderState.vectors);
    const key = vectors.social !== undefined ? "social" : "social";
    const current = typeof vectors[key] === "number" ? vectors[key] : 0;
    vectors[key] = clamp(current + 1);
    await updateDailyStateValues(fromUserId, {
      energy: senderState.energy,
      stress: senderState.stress,
      vectors,
    });
  }

  const receiverState = await fetchDailyState(toUserId);
  if (receiverState) {
    const vectors = toVectors(receiverState.vectors);
    const nextEnergy = clamp((receiverState.energy ?? 0) + 1);
    const nextStress = clamp((receiverState.stress ?? 0) - 2);
    await updateDailyStateValues(toUserId, {
      energy: nextEnergy,
      stress: nextStress,
      vectors,
    });
  }

  const newPayload = { ...(payload as Record<string, unknown>), effects_applied: true };
  const { error: payloadError } = await supabase
    .from("social_actions")
    .update({ payload: newPayload })
    .eq("id", boostId);

  if (payloadError) {
    console.error("Failed to mark boost effects_applied", payloadError);
  }
}

export async function sendBoost(
  fromUserId: string,
  toUserId: string,
  dayIndex: number
): Promise<void> {
  const dayValue = dayIndex.toString();
  const existing = await getExistingBoost(fromUserId, dayValue);
  if (existing) {
    if ((existing.payload as any)?.effects_applied) {
      throw new Error("Boost already sent for today.");
    }
    // Existing boost without marker; treat as sent but avoid double-applying effects.
    throw new Error("Boost already sent for today.");
  }

  const { data, error } = await supabase
    .from("social_actions")
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      action_type: "boost",
      payload: { day_index: dayValue },
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to send boost", error);

    // In case of a race, recheck; if it now exists, treat as success.
    const existsAfterError = await getExistingBoost(fromUserId, dayValue);
    if (existsAfterError) return;

    throw error;
  }

  if (data?.id) {
    await applyBoostEffects(data.id, fromUserId, toUserId);
  }
}
