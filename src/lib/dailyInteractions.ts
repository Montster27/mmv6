import { supabase } from "@/lib/supabase/browser";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "@/types/dailyInteraction";
import { skillCostForLevel } from "@/core/sim/skillProgression";

export type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "@/types/dailyInteraction";

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

export async function fetchUnresolvedTensions(
  userId: string,
  dayIndex: number
): Promise<Array<{ key: string; severity?: number | null }>> {
  const { data, error } = await supabase
    .from("daily_tensions")
    .select("key,severity")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .is("resolved_at", null);

  if (error) {
    console.error("Failed to fetch unresolved tensions", error);
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

export async function ensureTensionsUpToDate(
  userId: string,
  dayIndex: number
): Promise<void> {
  const yesterday = dayIndex - 1;
  const { data: carryover, error: carryError } = await supabase
    .from("daily_tensions")
    .select("user_id,day_index,key,severity,expires_day_index,resolved_at,meta")
    .eq("user_id", userId)
    .eq("day_index", yesterday)
    .is("resolved_at", null)
    .gte("expires_day_index", dayIndex);

  if (carryError) {
    console.error("Failed to load prior tensions", carryError);
    return;
  }

  if (carryover && carryover.length > 0) {
    const payload = carryover.map((tension) => ({
      user_id: tension.user_id,
      day_index: dayIndex,
      key: tension.key,
      severity: Math.min(3, tension.severity + 1),
      expires_day_index: tension.expires_day_index,
      resolved_at: null,
      meta: tension.meta ?? null,
    }));
    const { error: upsertError } = await supabase
      .from("daily_tensions")
      .upsert(payload, { onConflict: "user_id,day_index,key" });
    if (upsertError) {
      console.error("Failed to carry tensions forward", upsertError);
    }
  }

  const { data: today, error: todayError } = await supabase
    .from("daily_tensions")
    .select("key")
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (todayError) {
    console.error("Failed to load today tensions", todayError);
    return;
  }

  const keys = new Set((today ?? []).map((row) => row.key));
  const count = keys.size;
  if (count >= 2) return;

  if (count === 0) {
    const { error: insertError } = await supabase
      .from("daily_tensions")
      .upsert(
        {
          user_id: userId,
          day_index: dayIndex,
          key: "unfinished_assignment",
          severity: 1,
          expires_day_index: dayIndex + 2,
          resolved_at: null,
          meta: { hint: "Address with Study allocation" },
        },
        { onConflict: "user_id,day_index,key" }
      );
    if (insertError) {
      console.error("Failed to seed daily tension", insertError);
    }
    return;
  }

  if (count === 1 && !keys.has("fatigue")) {
    const { error: insertError } = await supabase
      .from("daily_tensions")
      .upsert(
        {
          user_id: userId,
          day_index: dayIndex,
          key: "fatigue",
          severity: 1,
          expires_day_index: dayIndex + 1,
          resolved_at: null,
          meta: { hint: "Address with Health allocation" },
        },
        { onConflict: "user_id,day_index,key" }
      );
    if (insertError) {
      console.error("Failed to seed fatigue tension", insertError);
    }
  }
}

export async function resolveTension(
  userId: string,
  dayIndex: number,
  key: string
): Promise<void> {
  const { error } = await supabase
    .from("daily_tensions")
    .update({ resolved_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .eq("key", key)
    .is("resolved_at", null);

  if (error) {
    console.error("Failed to resolve tension", error);
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

export async function ensureSkillBankUpToDate(
  userId: string,
  dayIndex: number
): Promise<void> {
  const { data, error } = await supabase
    .from("skill_bank")
    .select("user_id,available_points,cap,last_awarded_day_index")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load skill bank for award", error);
    return;
  }

  if (!data) {
    const { error: insertError } = await supabase.from("skill_bank").insert({
      user_id: userId,
      available_points: 0,
      cap: 10,
      last_awarded_day_index: null,
    });
    if (insertError) {
      console.error("Failed to create skill bank", insertError);
    }
    return;
  }

  return;
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

export async function submitPosture(params: {
  userId: string;
  dayIndex: number;
  posture: DailyPosture["posture"];
}): Promise<void> {
  const allowed = new Set<DailyPosture["posture"]>([
    "push",
    "steady",
    "recover",
    "connect",
  ]);
  if (!allowed.has(params.posture)) {
    throw new Error("Invalid posture.");
  }

  const { error } = await supabase.from("daily_posture").insert({
    user_id: params.userId,
    day_index: params.dayIndex,
    posture: params.posture,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Posture already set for today.");
    }
    console.error("Failed to submit posture", error);
    throw error;
  }
}

export async function fetchSkillAllocations(
  userId: string,
  dayIndex: number
): Promise<SkillPointAllocation[]> {
  const { data, error } = await supabase
    .from("skill_point_allocations")
    .select("user_id,day_index,skill_key,points,created_at")
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to fetch skill allocations", error);
    return [];
  }

  return data ?? [];
}

export async function fetchSkillLevels(
  userId: string
): Promise<{ focus: number; memory: number; networking: number; grit: number }> {
  const { data, error } = await supabase
    .from("skill_point_allocations")
    .select("skill_key")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch skill levels", error);
    return { focus: 0, memory: 0, networking: 0, grit: 0 };
  }

  const counts = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const key = row.skill_key;
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return {
    focus: counts.get("focus") ?? 0,
    memory: counts.get("memory") ?? 0,
    networking: counts.get("networking") ?? 0,
    grit: counts.get("grit") ?? 0,
  };
}

export async function allocateSkillPoint(params: {
  userId: string;
  dayIndex: number;
  skillKey: string;
}): Promise<void> {
  const skillKey = params.skillKey.trim();
  if (!skillKey || skillKey.length > 64) {
    throw new Error("Invalid skill key.");
  }

  const { data: bank, error: bankError } = await supabase
    .from("skill_bank")
    .select("user_id,available_points,cap,last_awarded_day_index")
    .eq("user_id", params.userId)
    .limit(1)
    .maybeSingle();

  if (bankError) {
    console.error("Failed to load skill bank", bankError);
    throw bankError;
  }

  if (!bank || bank.available_points <= 0) {
    throw new Error("No skill points available.");
  }

  const { data: priorAllocations, error: priorError } = await supabase
    .from("skill_point_allocations")
    .select("skill_key")
    .eq("user_id", params.userId)
    .eq("skill_key", skillKey);

  if (priorError) {
    console.error("Failed to load skill level", priorError);
    throw priorError;
  }

  const currentLevel = (priorAllocations ?? []).length;
  const nextLevel = currentLevel + 1;
  const cost = skillCostForLevel(nextLevel);
  if (bank.available_points < cost) {
    throw new Error("Not enough skill points for this level.");
  }

  const allocationPayload = {
    user_id: params.userId,
    day_index: params.dayIndex,
    skill_key: skillKey,
    points: cost,
  };

  const { error: insertError } = await supabase
    .from("skill_point_allocations")
    .insert(allocationPayload);

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("Skill already allocated today.");
    }
    console.error("Failed to insert skill allocation", insertError);
    throw insertError;
  }

  const { data: updated, error: updateError } = await supabase
    .from("skill_bank")
    .update({ available_points: bank.available_points - cost })
    .eq("user_id", params.userId)
    .gte("available_points", cost)
    .select("available_points");

  if (updateError || !updated || updated.length === 0) {
    const { error: rollbackError } = await supabase
      .from("skill_point_allocations")
      .delete()
      .match({
        user_id: params.userId,
        day_index: params.dayIndex,
        skill_key: skillKey,
      });
    if (rollbackError) {
      console.error("Failed to rollback skill allocation", rollbackError);
    }
    if (updateError) {
      console.error("Failed to decrement skill bank", updateError);
      throw updateError;
    }
    throw new Error("Failed to decrement skill bank.");
  }
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
