import { supabase } from "@/lib/supabase/browser";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "@/types/dailyInteraction";

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
      available_points: 1,
      cap: 2,
      last_awarded_day_index: dayIndex,
    });
    if (insertError) {
      console.error("Failed to create skill bank", insertError);
    }
    return;
  }

  if (
    typeof data.last_awarded_day_index === "number" &&
    data.last_awarded_day_index >= dayIndex
  ) {
    return;
  }

  const cap = data.cap > 0 ? data.cap : 2;
  const nextAvailable = Math.min(cap, data.available_points + 1);

  const { error: updateError } = await supabase
    .from("skill_bank")
    .update({
      available_points: nextAvailable,
      cap,
      last_awarded_day_index: dayIndex,
    })
    .eq("user_id", userId)
    .or(`last_awarded_day_index.is.null,last_awarded_day_index.lt.${dayIndex}`);

  if (updateError) {
    console.error("Failed to award skill point", updateError);
  }
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

  const allocationPayload = {
    user_id: params.userId,
    day_index: params.dayIndex,
    skill_key: skillKey,
    points: 1,
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
    .update({ available_points: bank.available_points - 1 })
    .eq("user_id", params.userId)
    .gte("available_points", 1)
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
