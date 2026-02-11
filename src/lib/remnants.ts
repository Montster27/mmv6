import { supabase } from "@/lib/supabase/browser";
import type { DailyState } from "@/types/daily";
import type { PlayerDayState } from "@/types/dayState";
import type {
  RemnantDefinition,
  RemnantKey,
  RemnantSelection,
  RemnantUnlock,
} from "@/types/remnants";

const REMNANTS: RemnantDefinition[] = [
  {
    key: "memory_fragment",
    name: "Memory Fragment",
    description: "A small memory returns at the right moment.",
    effect: "+1 Knowledge on the first day of a new run.",
  },
  {
    key: "relationship_echo",
    name: "Relationship Echo",
    description: "A past bond keeps its quiet weight.",
    effect: "+1 Social Leverage on the first day of a new run.",
  },
  {
    key: "composure_scar",
    name: "Composure Scar",
    description: "You learned where your edge was.",
    effect: "+2 Physical Resilience on the first day of a new run.",
  },
  {
    key: "anomaly_thread",
    name: "Anomaly Thread",
    description: "A strange detail stays threaded to you.",
    effect: "-1 Stress on the first day of a new run.",
  },
];

const remnantByKey = new Map(REMNANTS.map((remnant) => [remnant.key, remnant]));

export function listRemnantDefinitions() {
  return REMNANTS;
}

export function getRemnantDefinition(key: RemnantKey) {
  return remnantByKey.get(key) ?? null;
}

export function pickRemnantKeyForUnlock(params: {
  dailyState: DailyState | null;
  dayState: PlayerDayState | null;
}): RemnantKey {
  const vectors = params.dailyState?.vectors ?? {};
  const stress = params.dayState?.stress ?? params.dailyState?.stress ?? 0;

  if (stress >= 70) return "composure_scar";
  if (typeof vectors.social === "number" && vectors.social >= 5) {
    return "relationship_echo";
  }
  if (typeof vectors.curiosity === "number" && vectors.curiosity >= 4) {
    return "anomaly_thread";
  }
  return "memory_fragment";
}

export async function fetchUnlockedRemnants(
  userId: string
): Promise<RemnantKey[]> {
  const { data, error } = await supabase
    .from("remnant_unlocks")
    .select("remnant_key")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch remnant unlocks", error);
    return [];
  }

  return (data ?? []).map((row) => (row as RemnantUnlock).remnant_key);
}

export async function fetchActiveRemnant(
  userId: string
): Promise<RemnantSelection | null> {
  const { data, error } = await supabase
    .from("remnant_selections")
    .select("user_id,remnant_key,selected_at,active,last_applied_day_index")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active remnant", error);
    return null;
  }

  return (data as RemnantSelection) ?? null;
}

export async function unlockRemnant(userId: string, key: RemnantKey) {
  const { data: existing } = await supabase
    .from("remnant_unlocks")
    .select("remnant_key")
    .eq("user_id", userId)
    .eq("remnant_key", key)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase.from("remnant_unlocks").insert({
    user_id: userId,
    remnant_key: key,
  });

  if (error) {
    console.error("Failed to unlock remnant", error);
    return false;
  }

  return true;
}

export async function selectRemnant(userId: string, key: RemnantKey) {
  const { error } = await supabase
    .from("remnant_selections")
    .upsert(
      {
        user_id: userId,
        remnant_key: key,
        active: true,
        selected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Failed to select remnant", error);
    return false;
  }

  return true;
}

function applyRemnantDelta(
  dayState: PlayerDayState,
  key: RemnantKey
): PlayerDayState {
  switch (key) {
    case "memory_fragment":
      return { ...dayState, knowledge: (dayState.knowledge ?? 0) + 1 };
    case "relationship_echo":
      return { ...dayState, socialLeverage: (dayState.socialLeverage ?? 0) + 1 };
    case "composure_scar":
      return {
        ...dayState,
        physicalResilience: Math.min(
          100,
          (dayState.physicalResilience ?? 0) + 2
        ),
      };
    case "anomaly_thread":
      return { ...dayState, stress: Math.max(0, (dayState.stress ?? 0) - 1) };
    default:
      return dayState;
  }
}

export async function applyRemnantEffectForDay(params: {
  userId: string;
  dayIndex: number;
  dayState: PlayerDayState | null;
}): Promise<{
  applied: boolean;
  dayState: PlayerDayState | null;
  activeKey: RemnantKey | null;
}> {
  const { userId, dayIndex, dayState } = params;
  if (!dayState) return { applied: false, dayState: null, activeKey: null };
  if (dayIndex > 1) return { applied: false, dayState, activeKey: null };

  const active = await fetchActiveRemnant(userId);
  if (!active?.remnant_key) {
    return { applied: false, dayState, activeKey: null };
  }
  if (active.last_applied_day_index === dayIndex) {
    return { applied: false, dayState, activeKey: active.remnant_key };
  }

  const updated = applyRemnantDelta(dayState, active.remnant_key);

  const { error } = await supabase
    .from("player_day_state")
    .update({
      energy: updated.energy,
      stress: updated.stress,
      cashOnHand: updated.cashOnHand,
      knowledge: updated.knowledge,
      socialLeverage: updated.socialLeverage,
      physicalResilience: updated.physicalResilience,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to apply remnant effect", error);
    return { applied: false, dayState, activeKey: active.remnant_key };
  }

  await supabase
    .from("remnant_selections")
    .update({
      last_applied_day_index: dayIndex,
    })
    .eq("user_id", userId);

  return { applied: true, dayState: updated, activeKey: active.remnant_key };
}
