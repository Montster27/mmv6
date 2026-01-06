import { supabase } from "@/lib/supabaseClient";

export type StoryletListItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  choices: any;
  is_active: boolean;
};

export type DailyState = {
  id: string;
  user_id: string;
  day_index: number;
  energy: number;
  stress: number;
  vectors: Record<string, unknown>;
  start_date?: string;
  last_day_completed?: string | null;
  last_day_index_completed?: number | null;
};

export type TimeAllocation = Record<string, number>;

export type StoryletRun = {
  id: string;
  storylet_id: string;
  choice_id: string | null;
};

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
): Promise<TimeAllocation | null> {
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

  return data?.allocation ?? null;
}

export async function saveTimeAllocation(
  userId: string,
  dayIndex: number,
  allocation: TimeAllocation
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
  StoryletListItem[]
> {
  const { data, error } = await supabase
    .from("storylets")
    .select("id,slug,title,body,choices,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Failed to fetch storylets", error);
    return [];
  }

  return data ?? [];
}

export async function fetchTodayRuns(
  userId: string,
  dayIndex: number
): Promise<StoryletRun[]> {
  const { data, error } = await supabase
    .from("storylet_runs")
    .select("id,storylet_id,choice_id")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch storylet runs", error);
    return [];
  }

  return data ?? [];
}

export async function createStoryletRun(
  userId: string,
  storyletId: string,
  dayIndex: number,
  choiceId: string
) {
  const { error } = await supabase.from("storylet_runs").insert({
    user_id: userId,
    storylet_id: storyletId,
    day_index: dayIndex,
    choice_id: choiceId,
  });

  if (error) {
    console.error("Failed to create storylet run", error);
    throw error;
  }
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
