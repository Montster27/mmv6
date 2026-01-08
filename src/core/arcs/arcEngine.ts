import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";
import { fetchDailyState } from "@/lib/play";
import type { DailyState } from "@/types/daily";
import type { Storylet, StoryletRun } from "@/types/storylets";
import { ARC_DEFINITIONS, getArcDefinition } from "@/content/arcs/arcDefinitions";

export type UserArc = {
  id: string;
  user_id: string;
  arc_id: string;
  status: "active" | "completed" | "abandoned";
  step_index: number;
  started_day_index: number;
  last_advanced_day_index: number | null;
  created_at?: string;
  updated_at?: string;
};

function devWarn(message: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, payload);
  }
}

function clampVectorDelta(value: number, delta: number) {
  return Math.min(100, Math.max(0, value + delta));
}

function applyArcPayoff(
  daily: DailyState,
  deltas: { stress?: number; vectors?: Record<string, number> }
): { next: DailyState; applied: { stress?: number; vectors?: Record<string, number> } } {
  const next: DailyState = { ...daily };
  const applied: { stress?: number; vectors?: Record<string, number> } = {};

  if (typeof deltas.stress === "number") {
    next.stress = clampVectorDelta(daily.stress ?? 0, deltas.stress);
    applied.stress = deltas.stress;
  }

  if (deltas.vectors) {
    const current = daily.vectors && typeof daily.vectors === "object" ? daily.vectors : {};
    const nextVectors: Record<string, number> = { ...(current as Record<string, number>) };
    const appliedVectors: Record<string, number> = {};
    for (const [key, delta] of Object.entries(deltas.vectors)) {
      if (typeof delta !== "number") continue;
      const base = typeof nextVectors[key] === "number" ? nextVectors[key] : 0;
      nextVectors[key] = clampVectorDelta(base, delta);
      appliedVectors[key] = delta;
    }
    next.vectors = nextVectors;
    applied.vectors = appliedVectors;
  }

  return { next, applied };
}

export async function getOrStartArc(
  userId: string,
  dayIndex: number
): Promise<UserArc | null> {
  const arc = ARC_DEFINITIONS[0];
  if (!arc) return null;
  if (dayIndex < arc.start_day_index) return null;

  const { data, error } = await supabase
    .from("user_arcs")
    .select("id,user_id,arc_id,status,step_index,started_day_index,last_advanced_day_index,created_at,updated_at")
    .eq("user_id", userId)
    .eq("arc_id", arc.arc_id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user arc", error);
    return null;
  }

  if (data) return data as UserArc;

  const insertPayload = {
    user_id: userId,
    arc_id: arc.arc_id,
    status: "active",
    step_index: 0,
    started_day_index: dayIndex,
  };

  const { error: insertError } = await supabase.from("user_arcs").insert(insertPayload);
  if (insertError) {
    const { data: retry } = await supabase
      .from("user_arcs")
      .select("id,user_id,arc_id,status,step_index,started_day_index,last_advanced_day_index,created_at,updated_at")
      .eq("user_id", userId)
      .eq("arc_id", arc.arc_id)
      .limit(1)
      .maybeSingle();
    if (retry) return retry as UserArc;
    console.error("Failed to create user arc", insertError);
    return null;
  }

  trackEvent({ event_type: "arc_started", day_index: dayIndex, payload: { arc_id: arc.arc_id } });

  const { data: created } = await supabase
    .from("user_arcs")
    .select("id,user_id,arc_id,status,step_index,started_day_index,last_advanced_day_index,created_at,updated_at")
    .eq("user_id", userId)
    .eq("arc_id", arc.arc_id)
    .limit(1)
    .maybeSingle();

  return created ? (created as UserArc) : null;
}

export function getArcNextStepStorylet(
  userArc: UserArc | null,
  dayIndex: number,
  storyletsPool: Storylet[],
  todayRuns: StoryletRun[]
): Storylet | null {
  if (!userArc) return null;
  if (userArc.status !== "active") return null;
  const arc = getArcDefinition(userArc.arc_id);
  if (!arc) return null;
  if (userArc.step_index >= arc.steps.length) return null;
  if (userArc.last_advanced_day_index === dayIndex) return null;

  const step = arc.steps[userArc.step_index];
  if (step.min_day_gap && userArc.last_advanced_day_index !== null) {
    const gap = dayIndex - userArc.last_advanced_day_index;
    if (gap < step.min_day_gap) return null;
  }

  const todayUsedIds = new Set(todayRuns.map((run) => run.storylet_id));
  const storylet = storyletsPool.find((s) => s.slug === step.storylet_slug);
  if (!storylet) {
    devWarn("Arc storylet missing", { arc_id: arc.arc_id, slug: step.storylet_slug });
    return null;
  }
  if (todayUsedIds.has(storylet.id)) return null;

  return storylet;
}

export async function advanceArcIfStepCompleted(
  userId: string,
  arcId: string,
  dayIndex: number,
  storyletSlug: string
): Promise<{
  appliedDeltas?: { stress?: number; vectors?: Record<string, number> };
  nextDailyState?: DailyState;
} | null> {
  const arc = getArcDefinition(arcId);
  if (!arc) return null;

  const { data: userArc, error } = await supabase
    .from("user_arcs")
    .select("id,user_id,arc_id,status,step_index,started_day_index,last_advanced_day_index")
    .eq("user_id", userId)
    .eq("arc_id", arc.arc_id)
    .limit(1)
    .maybeSingle();

  if (error || !userArc) {
    if (error) console.error("Failed to load arc for advance", error);
    return null;
  }

  if (userArc.status !== "active") return null;
  if (userArc.last_advanced_day_index === dayIndex) return null;
  if (userArc.step_index >= arc.steps.length) return null;

  const currentStep = arc.steps[userArc.step_index];
  if (currentStep.storylet_slug !== storyletSlug) return null;

  const nextStepIndex = userArc.step_index + 1;
  const completed = nextStepIndex >= arc.steps.length;
  const nextStatus = completed ? "completed" : "active";

  const { error: updateError } = await supabase
    .from("user_arcs")
    .update({
      step_index: nextStepIndex,
      status: nextStatus,
      last_advanced_day_index: dayIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userArc.id);

  if (updateError) {
    console.error("Failed to advance arc", updateError);
    return null;
  }

  trackEvent({
    event_type: "arc_step_completed",
    day_index: dayIndex,
    payload: { arc_id: arc.arc_id, step_index: userArc.step_index },
  });

  if (completed) {
    trackEvent({
      event_type: "arc_completed",
      day_index: dayIndex,
      payload: { arc_id: arc.arc_id },
    });
  }

  if (!completed || !arc.payoff?.deltas) return null;

  const daily = await fetchDailyState(userId);
  if (!daily) return null;

  const { next, applied } = applyArcPayoff(daily, arc.payoff.deltas);
  const { error: dailyError } = await supabase
    .from("daily_states")
    .update({
      stress: next.stress,
      vectors: next.vectors,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (dailyError) {
    console.error("Failed to apply arc payoff", dailyError);
    return null;
  }

  return { appliedDeltas: applied, nextDailyState: next };
}
