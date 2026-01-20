import { supabase } from "@/lib/supabase/browser";

const COHORT_CAP = 30;

export async function fetchUserCohort(
  userId: string
): Promise<{ cohortId: string } | null> {
  const { data, error } = await supabase
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch cohort membership", error);
    return null;
  }

  return data ? { cohortId: data.cohort_id } : null;
}

export async function ensureUserInCohort(
  userId: string
): Promise<{ cohortId: string }> {
  const existing = await fetchUserCohort(userId);
  if (existing) return existing;

  const { data: candidate, error: candidateError } = await supabase
    .from("cohorts")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (candidateError) {
    console.error("Failed to find cohort", candidateError);
  }

  let cohortId = candidate?.id ?? null;
  if (cohortId) {
    const { count, error: countError } = await supabase
      .from("cohort_members")
      .select("cohort_id", { count: "exact", head: true })
      .eq("cohort_id", cohortId);
    if (countError) {
      console.error("Failed to count cohort members", countError);
    }
    if (count !== null && count >= COHORT_CAP) {
      cohortId = null;
    }
  }

  if (!cohortId) {
    const { data: created, error: createError } = await supabase
      .from("cohorts")
      .insert({})
      .select("id")
      .limit(1)
      .maybeSingle();
    if (createError) {
      console.error("Failed to create cohort", createError);
      throw createError;
    }
    cohortId = created?.id ?? null;
  }

  if (!cohortId) {
    throw new Error("Unable to assign cohort.");
  }

  const { error: insertError } = await supabase.from("cohort_members").insert({
    cohort_id: cohortId,
    user_id: userId,
  });

  if (insertError) {
    console.error("Failed to join cohort", insertError);
    throw insertError;
  }

  return { cohortId };
}
