import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";
import { getFeatureFlags } from "@/lib/featureFlags";

const DEFAULT_COHORT_CAP = 30;
const ROOKIE_COHORT_CAP = 5;

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
  const featureFlags = getFeatureFlags();
  const useRookieCap =
    featureFlags.rookieCircleEnabled || featureFlags.verticalSlice30Enabled;
  const cohortCap = useRookieCap ? ROOKIE_COHORT_CAP : DEFAULT_COHORT_CAP;
  const existing = await fetchUserCohort(userId);
  if (existing) return existing;

  let createdCohort = false;
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
    if (count !== null && count >= cohortCap) {
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
    createdCohort = Boolean(cohortId);
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

  if (useRookieCap) {
    if (createdCohort) {
      trackEvent({
        event_type: "rookie_circle_created",
        payload: { cohort_id: cohortId },
      });
    }
    trackEvent({
      event_type: "rookie_circle_assigned",
      payload: { cohort_id: cohortId },
    });
  }

  return { cohortId };
}

export async function fetchCohortRoster(cohortId: string): Promise<{
  count: number;
  handles: string[];
}> {
  const { data: members, error: memberError } = await supabase
    .from("cohort_members")
    .select("user_id")
    .eq("cohort_id", cohortId);

  if (memberError) {
    console.error("Failed to fetch cohort roster", memberError);
    return { count: 0, handles: [] };
  }

  const memberIds = (members ?? []).map((row) => row.user_id);
  if (memberIds.length === 0) {
    return { count: 0, handles: [] };
  }

  const { data: profiles, error: profileError } = await supabase
    .from("public_profiles")
    .select("user_id,display_name")
    .in("user_id", memberIds);

  if (profileError) {
    console.error("Failed to fetch cohort handles", profileError);
    return { count: memberIds.length, handles: [] };
  }

  const profileMap = new Map(
    (profiles ?? []).map((row) => [row.user_id, row.display_name])
  );

  const handles = memberIds.map((userId, index) => {
    const raw = profileMap.get(userId);
    return raw && raw.trim().length > 0 ? raw : `Handle ${index + 1}`;
  });

  return { count: memberIds.length, handles };
}
