import { supabase } from "@/lib/supabase/browser";
import { applyAlignmentDelta } from "@/lib/alignment";
import { fetchActiveDirectiveForCohort } from "@/lib/directives";
import { fetchInitiativeCatalogByKey } from "@/lib/content/initiatives";
import type { Initiative } from "@/types/initiatives";
import type { FactionDirective } from "@/types/factions";

const WEEK_LENGTH = 7;

function weekKey(dayIndex: number) {
  return Math.floor((dayIndex - 1) / WEEK_LENGTH);
}

export async function getOrCreateWeeklyInitiative(
  cohortId: string,
  dayIndex: number,
  directive?: FactionDirective | null
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

  const catalogKey = directive?.target_key ?? "campus_signal_watch";
  const catalog =
    catalogKey ? await fetchInitiativeCatalogByKey(catalogKey).catch(() => null) : null;

  const { data: created, error: createError } = await supabase
    .from("initiatives")
    .insert({
      cohort_id: cohortId,
      key,
      title: catalog?.title ?? "Quiet Logistics",
      description:
        catalog?.description ?? "Small, steady contributions keep the group moving.",
      starts_day_index,
      ends_day_index,
      status: "open",
      goal: catalog?.goal ?? 100,
      meta: catalogKey ? { catalog_key: catalogKey, directive_id: directive?.id } : null,
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

export async function fetchInitiativeForWeek(
  cohortId: string,
  weekStartDayIndex: number
): Promise<Initiative | null> {
  const { data, error } = await supabase
    .from("initiatives")
    .select(
      "id,cohort_id,key,title,description,created_at,starts_day_index,ends_day_index,status,goal,meta"
    )
    .eq("cohort_id", cohortId)
    .eq("starts_day_index", weekStartDayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch initiative for week", error);
    return null;
  }

  return data ?? null;
}

export async function closeInitiative(initiativeId: string): Promise<void> {
  const { data, error } = await supabase
    .from("initiatives")
    .update({ status: "closed" })
    .eq("id", initiativeId)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to close initiative", error);
    throw new Error("Failed to close initiative.");
  }
  if (!data) {
    throw new Error("Failed to close initiative.");
  }
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
  amount = 1,
  cohortId?: string | null
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

  let resolvedCohortId = cohortId ?? null;
  if (!resolvedCohortId) {
    const { data: initiative } = await supabase
      .from("initiatives")
      .select("cohort_id")
      .eq("id", initiativeId)
      .limit(1)
      .maybeSingle();
    resolvedCohortId = initiative?.cohort_id ?? null;
  }

  if (!resolvedCohortId) return;

  try {
    const directive = await fetchActiveDirectiveForCohort(resolvedCohortId, dayIndex);
    if (directive?.faction_key) {
      await applyAlignmentDelta({
        userId,
        dayIndex,
        factionKey: directive.faction_key,
        delta: 1,
        source: "initiative",
        sourceRef: initiativeId,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to apply alignment from initiative", err);
    }
  }
}
