import { supabase } from "@/lib/supabaseClient";
import type { AllocationMap, DailyState } from "@/types/daily";
import type { Storylet, StoryletChoice, StoryletRun } from "@/types/storylets";
import type { JsonObject } from "@/types/vectors";
import {
  coerceStoryletRow,
  fallbackStorylet,
  validateStorylet,
} from "@/core/validation/storyletValidation";
import { applyOutcomeToDailyState } from "@/core/engine/applyOutcome";

export type StoryletListItem = Storylet;
export type AllocationPayload = AllocationMap;

function parseChoices(raw: unknown): StoryletChoice[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          typeof (item as any).id === "string" &&
          typeof (item as any).label === "string"
        ) {
          return {
            id: (item as any).id,
            label: (item as any).label,
            outcome: (item as any).outcome,
          } as StoryletChoice;
        }
        return null;
      })
      .filter((v): v is StoryletChoice => Boolean(v));
  }
  // Defensive: if DB returns non-array, coerce to empty array to avoid runtime errors.
  return [];
}

function normalizeAllocation(raw: unknown): AllocationMap {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw as JsonObject)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => [k, v as number]);
    return Object.fromEntries(entries);
  }
  return {};
}

export async function fetchDailyState(
  userId: string
): Promise<DailyState | null> {
  const { data, error } = await supabase
    .from("daily_states")
    .select(
      "id,user_id,day_index,energy,stress,vectors,start_date,last_day_completed,last_day_index_completed"
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch daily state", error);
    return null;
  }

  return data;
}

export async function fetchTimeAllocation(
  userId: string,
  dayIndex: number
): Promise<AllocationMap | null> {
  const { data, error } = await supabase
    .from("time_allocations")
    .select("allocation")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch time allocation", error);
    return null;
  }

  return data?.allocation ? normalizeAllocation(data.allocation) : null;
}

export function toChoices(storylet: Storylet | any): StoryletChoice[] {
  if (Array.isArray(storylet?.choices)) {
    return storylet.choices as StoryletChoice[];
  }
  if (typeof storylet?.choices === "string") {
    try {
      const parsed = JSON.parse(storylet.choices);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveTimeAllocation(
  userId: string,
  dayIndex: number,
  allocation: AllocationPayload
) {
  const { error } = await supabase.from("time_allocations").upsert(
    {
      user_id: userId,
      day_index: dayIndex,
      allocation,
    },
    { onConflict: "user_id,day_index" }
  );

  if (error) {
    console.error("Failed to save time allocation", error);
    throw error;
  }
}

export async function fetchTodayStoryletCandidates(): Promise<
  Storylet[]
> {
  const { data, error } = await supabase
    .from("storylets")
    .select("id,slug,title,body,choices,is_active,created_at,tags,requirements,weight")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Failed to fetch storylets", error);
    return [];
  }

  return (
    data?.map((item) => {
      const coerced = coerceStoryletRow({
        ...item,
        choices: parseChoices(item.choices),
      });
      const validated = validateStorylet(coerced);
      if (validated.ok) return validated.value;
      console.warn("Invalid storylet row; using fallback", validated.errors);
      return fallbackStorylet();
    }) ?? []
  );
}

export async function fetchTodayRuns(
  userId: string,
  dayIndex: number
): Promise<StoryletRun[]> {
  const { data, error } = await supabase
    .from("storylet_runs")
    .select("id,user_id,storylet_id,day_index,choice_id,created_at")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch storylet runs", error);
    return [];
  }

  return data ?? [];
}

export async function updateDailyState(
  userId: string,
  nextState: Pick<DailyState, "energy" | "stress" | "vectors">
) {
  const { error } = await supabase
    .from("daily_states")
    .update({
      energy: nextState.energy,
      stress: nextState.stress,
      vectors: nextState.vectors,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update daily state", error);
    throw error;
  }
}

export async function createStoryletRun(
  userId: string,
  storyletId: string,
  dayIndex: number,
  choiceId: string
) {
  const { data: existing, error: existingError } = await supabase
    .from("storylet_runs")
    .select("id")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .eq("storylet_id", storyletId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check existing storylet run", existingError);
  }

  if (existing?.id) {
    return existing.id;
  }

  const { error } = await supabase.from("storylet_runs").insert({
    user_id: userId,
    storylet_id: storyletId,
    day_index: dayIndex,
    choice_id: choiceId,
  });

  if (error) {
    console.error("Failed to create storylet run", error);
    const { data: retry } = await supabase
      .from("storylet_runs")
      .select("id")
      .eq("user_id", userId)
      .eq("day_index", dayIndex)
      .eq("storylet_id", storyletId)
      .limit(1)
      .maybeSingle();
    if (retry?.id) {
      return retry.id;
    }
    throw error;
  }

  return null;
}

export async function fetchRecentStoryletRuns(
  userId: string,
  dayIndex: number,
  daysBack: number
): Promise<StoryletRun[]> {
  const fromDay = dayIndex - daysBack;
  const { data, error } = await supabase
    .from("storylet_runs")
    .select("id,user_id,storylet_id,day_index,choice_id,created_at")
    .eq("user_id", userId)
    .gte("day_index", fromDay)
    .order("day_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch recent storylet runs", error);
    return [];
  }

  return data ?? [];
}

export async function applyOutcomeForChoice(
  dailyState: DailyState,
  choiceId: string,
  storylet: Storylet,
  userId: string
): Promise<{
  nextDailyState: DailyState;
  appliedMessage: string;
  appliedDeltas: {
    energy?: number;
    stress?: number;
    vectors?: Record<string, number>;
  };
}> {
  const choice = toChoices(storylet).find((c) => c.id === choiceId);
  const { nextDailyState, appliedDeltas, message } = applyOutcomeToDailyState(
    dailyState,
    choice?.outcome
  );
  await updateDailyState(userId, nextDailyState);
  return { nextDailyState, appliedMessage: message, appliedDeltas };
}

export async function markDailyComplete(
  userId: string,
  dayIndex: number
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("daily_states")
    .update({
      last_day_completed: today,
      last_day_index_completed: dayIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to mark daily complete", error);
    throw error;
  }
}
