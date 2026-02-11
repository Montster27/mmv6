import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";

export type BuddyAssignment = {
  user_id: string;
  buddy_user_id: string | null;
  buddy_type: "human" | "ai";
  created_at: string;
};

export type BuddyNudge = {
  id: string;
  label: string;
  message: string;
};

const NUDGES: BuddyNudge[] = [
  {
    id: "early_choice_confidence",
    label: "Early choice confidence",
    message: "Trust your first read. Pick the option that keeps today clean.",
  },
  {
    id: "bank_remnant",
    label: "Remind to bank a remnant",
    message: "If something sticks out today, mark it. Later it becomes a remnant.",
  },
  {
    id: "anomaly_explore",
    label: "Anomaly exploration suggestion",
    message: "If the strange detail returns, test it once. A pattern starts there.",
  },
];

function pickDeterministicBuddyId(candidateIds: string[], userId: string) {
  if (candidateIds.length === 0) return null;
  const seed = `${userId}:${candidateIds.join("|")}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  const idx = hash % candidateIds.length;
  return candidateIds[idx];
}

export async function getOrAssignBuddy(
  userId: string,
  cohortId: string
): Promise<BuddyAssignment> {
  const { data: existing, error: existingError } = await supabase
    .from("buddy_assignments")
    .select("user_id,buddy_user_id,buddy_type,created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch buddy assignment", existingError);
  }

  if (existing) {
    return existing as BuddyAssignment;
  }

  const { data: members, error: memberError } = await supabase
    .from("cohort_members")
    .select("user_id")
    .eq("cohort_id", cohortId)
    .neq("user_id", userId);

  if (memberError) {
    console.error("Failed to fetch cohort members for buddy", memberError);
  }

  const candidateIds = (members ?? []).map((row) => row.user_id);
  const buddyUserId = pickDeterministicBuddyId(candidateIds, userId);
  const buddyType: "human" | "ai" = buddyUserId ? "human" : "ai";

  const { data: insertRow, error: insertError } = await supabase
    .from("buddy_assignments")
    .insert({
      user_id: userId,
      buddy_user_id: buddyUserId,
      buddy_type: buddyType,
    })
    .select("user_id,buddy_user_id,buddy_type,created_at")
    .maybeSingle();

  if (insertError) {
    console.error("Failed to create buddy assignment", insertError);
    return {
      user_id: userId,
      buddy_user_id: buddyUserId ?? null,
      buddy_type: buddyType,
      created_at: new Date().toISOString(),
    };
  }

  trackEvent({
    event_type: buddyType === "human" ? "buddy_assigned_human" : "buddy_assigned_ai",
    payload: { buddy_user_id: buddyUserId ?? null, cohort_id: cohortId },
  });

  return insertRow as BuddyAssignment;
}

export function getBuddyNudges(): BuddyNudge[] {
  return NUDGES;
}

export function trackBuddyNudge(nudgeId: string) {
  trackEvent({ event_type: "buddy_nudge_used", payload: { nudge_id: nudgeId } });
}
