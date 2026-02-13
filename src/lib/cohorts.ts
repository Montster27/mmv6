import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";
import { getFeatureFlags } from "@/lib/featureFlags";

/**
 * Fetch user's cohort membership.
 * Note: This may fail with RLS errors if user is not yet in a cohort.
 * Use ensureUserInCohort() which calls the API route for reliable access.
 */
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
    // Don't log RLS errors as they're expected for new users
    if (error.code !== "42501") {
      console.error("Failed to fetch cohort membership", error);
    }
    return null;
  }

  return data ? { cohortId: data.cohort_id } : null;
}

/**
 * Ensure user is assigned to a cohort.
 * Uses server-side API route to bypass RLS restrictions.
 */
export async function ensureUserInCohort(
  userId: string
): Promise<{ cohortId: string }> {
  const featureFlags = getFeatureFlags();
  const useRookieCap =
    featureFlags.rookieCircleEnabled || featureFlags.verticalSlice30Enabled;

  // Get auth token for API call
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error("No session found");
  }

  // Call server-side API route which uses service role to bypass RLS
  const res = await fetch("/api/cohort/ensure", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();

  if (!res.ok) {
    console.error("Failed to ensure cohort membership", json.error);
    throw new Error(json.error ?? "Failed to ensure cohort membership");
  }

  const cohortId = json.cohortId;

  // Track events for rookie circle feature
  if (useRookieCap && cohortId) {
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
