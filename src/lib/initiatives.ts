import { supabase } from "@/lib/supabase/browser";
import type { Initiative } from "@/types/initiatives";

const WEEK_LENGTH = 7;

function weekKey(dayIndex: number) {
  return Math.floor((dayIndex - 1) / WEEK_LENGTH);
}

export async function getOrCreateWeeklyInitiative(
  cohortId: string,
  dayIndex: number
): Promise<Initiative | null> {
  const key = `week_${weekKey(dayIndex)}`;
  const starts_day_index = weekKey(dayIndex) * WEEK_LENGTH + 1;
  const ends_day_index = starts_day_index + WEEK_LENGTH - 1;

  const { data: existing, error: existingError } = await supabase
    .from("initiatives")
    .select(
      "id,cohort_id,key,title,description,created_at,starts_day_index,ends_day_index,status,goal,meta"
    )
    .eq("cohort_id", cohortId)
    .eq("key", key)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch initiative", existingError);
    return null;
  }

  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("initiatives")
    .insert({
      cohort_id: cohortId,
      key,
      title: "Quiet Logistics",
      description: "Small, steady contributions keep the group moving.",
      starts_day_index,
      ends_day_index,
      status: "open",
      goal: 100,
    })
    .select(
      "id,cohort_id,key,title,description,created_at,starts_day_index,ends_day_index,status,goal,meta"
    )
    .limit(1)
    .maybeSingle();

  if (createError) {
    console.error("Failed to create initiative", createError);
    return null;
  }

  return created ?? null;
}

export async function fetchOpenInitiativesForCohort(
  cohortId: string,
  dayIndex: number
): Promise<Initiative[]> {
  const { data, error } = await supabase
    .from("initiatives")
    .select(
      "id,cohort_id,key,title,description,created_at,starts_day_index,ends_day_index,status,goal,meta"
    )
    .eq("cohort_id", cohortId)
    .eq("status", "open")
    .lte("starts_day_index", dayIndex)
    .gte("ends_day_index", dayIndex)
    .order("starts_day_index", { ascending: false });

  if (error) {
    console.error("Failed to load initiatives", error);
    return [];
  }

  return data ?? [];
}

export async function fetchUserContributionStatus(
  initiativeId: string,
  userId: string,
  dayIndex: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("initiative_contributions")
    .select("initiative_id")
    .eq("initiative_id", initiativeId)
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check contribution", error);
    return false;
  }

  return Boolean(data);
}

export async function fetchInitiativeProgress(
  initiativeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("initiative_contributions")
    .select("amount")
    .eq("initiative_id", initiativeId);

  if (error) {
    console.error("Failed to load initiative progress", error);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

export async function contributeToInitiative(
  initiativeId: string,
  userId: string,
  dayIndex: number,
  amount = 1
): Promise<void> {
  const { error } = await supabase.from("initiative_contributions").insert({
    initiative_id: initiativeId,
    user_id: userId,
    day_index: dayIndex,
    amount,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Contribution already recorded today.");
    }
    console.error("Failed to contribute", error);
    throw error;
  }
}
