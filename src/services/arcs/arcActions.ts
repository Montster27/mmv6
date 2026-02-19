import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import {
  applyDispositionCost,
  canProgressToday,
  computeArcExpireDay,
  computeNextDueDay,
} from "@/domain/arcs/engine";
import type {
  ArcDefinition,
  ArcInstance,
  ArcOffer,
  ArcStep,
  ArcStepOption,
  ChoiceLogEntry,
  ResourceDelta,
} from "@/domain/arcs/types";
import { normalizeResourceDelta, toLegacyResourceUpdates } from "@/core/resources/resourceMap";

const DEFAULT_PROGRESS_SLOTS = 2;

type DayState = {
  energy: number;
  stress: number;
  cashOnHand: number;
  knowledge: number;
  socialLeverage: number;
  physicalResilience: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function logChoice(entry: Omit<ChoiceLogEntry, "id">) {
  const { error } = await supabaseServer.from("choice_log").insert(entry);
  if (error) {
    console.error("Failed to write choice log", error);
  }
}

async function fetchArcDefinition(arcId: string): Promise<ArcDefinition | null> {
  const { data, error } = await supabaseServer
    .from("arc_definitions")
    .select("id,key,title,description,tags,is_enabled")
    .eq("id", arcId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch arc definition", error);
    return null;
  }
  return (data as ArcDefinition) ?? null;
}

async function fetchArcSteps(arcId: string): Promise<ArcStep[]> {
  const { data, error } = await supabaseServer
    .from("arc_steps")
    .select(
      "id,arc_id,step_key,order_index,title,body,options,default_next_step_key,due_offset_days,expires_after_days"
    )
    .eq("arc_id", arcId)
    .order("order_index", { ascending: true });
  if (error) {
    console.error("Failed to fetch arc steps", error);
    return [];
  }
  return (data ?? []) as ArcStep[];
}

async function fetchDayState(userId: string, dayIndex: number): Promise<DayState> {
  const { data, error } = await supabaseServer
    .from("player_day_state")
    .select("energy,stress,money,study_progress,social_capital,health")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Failed to load day state.");
  }
  return {
    energy: data.energy ?? 0,
    stress: data.stress ?? 0,
    cashOnHand: data.money ?? 0,
    knowledge: data.study_progress ?? 0,
    socialLeverage: data.social_capital ?? 0,
    physicalResilience: data.health ?? 0,
  };
}

async function applyDeltaToDayState(
  userId: string,
  dayIndex: number,
  delta: ResourceDelta
): Promise<void> {
  const dayState = await fetchDayState(userId, dayIndex);
  const rawResources = delta.resources ?? {};
  const energyDelta =
    typeof rawResources.energy === "number" ? rawResources.energy : 0;
  const stressDelta =
    typeof rawResources.stress === "number" ? rawResources.stress : 0;
  const resourceDelta = normalizeResourceDelta(rawResources);

  const nextEnergy =
    energyDelta !== 0
      ? clamp(dayState.energy + energyDelta, 0, 100)
      : dayState.energy;
  const nextStress =
    stressDelta !== 0
      ? clamp(dayState.stress + stressDelta, 0, 100)
      : dayState.stress;

  const nextResources = {
    knowledge:
      typeof resourceDelta.knowledge === "number"
        ? dayState.knowledge + resourceDelta.knowledge
        : dayState.knowledge,
    cashOnHand:
      typeof resourceDelta.cashOnHand === "number"
        ? dayState.cashOnHand + resourceDelta.cashOnHand
        : dayState.cashOnHand,
    socialLeverage:
      typeof resourceDelta.socialLeverage === "number"
        ? dayState.socialLeverage + resourceDelta.socialLeverage
        : dayState.socialLeverage,
    physicalResilience:
      typeof resourceDelta.physicalResilience === "number"
        ? clamp(dayState.physicalResilience + resourceDelta.physicalResilience, 0, 100)
        : dayState.physicalResilience,
  };

  const { error } = await supabaseServer
    .from("player_day_state")
    .update({
      energy: nextEnergy,
      stress: nextStress,
      ...toLegacyResourceUpdates(nextResources),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to update day state", error);
    throw new Error("Failed to update day state.");
  }
}

async function applyDispositionDeltas(userId: string, deltas: Record<string, number>) {
  for (const [tag, value] of Object.entries(deltas)) {
    const { data } = await supabaseServer
      .from("player_dispositions")
      .select("id,hesitation")
      .eq("user_id", userId)
      .eq("tag", tag)
      .limit(1)
      .maybeSingle();
    if (!data) {
      await supabaseServer.from("player_dispositions").insert({
        user_id: userId,
        tag,
        hesitation: Math.max(0, value),
      });
    } else {
      await supabaseServer
        .from("player_dispositions")
        .update({ hesitation: Math.max(0, data.hesitation + value) })
        .eq("id", data.id);
    }
  }
}

async function applySkillPoints(userId: string, delta: number) {
  if (!delta) return;
  const { data } = await supabaseServer
    .from("skill_bank")
    .select("user_id,available_points,cap,last_awarded_day_index")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    await supabaseServer.from("skill_bank").insert({
      user_id: userId,
      available_points: Math.max(0, delta),
      cap: 10,
      last_awarded_day_index: null,
    });
    return;
  }

  await supabaseServer
    .from("skill_bank")
    .update({ available_points: (data.available_points ?? 0) + delta })
    .eq("user_id", userId);
}

function mergeDeltas(costs?: ResourceDelta, rewards?: ResourceDelta): ResourceDelta {
  const merged: ResourceDelta = {};
  const resources: Record<string, number> = {};

  const apply = (source?: ResourceDelta, sign: number = 1) => {
    if (!source) return;
    if (source.resources) {
      for (const [key, value] of Object.entries(source.resources)) {
        if (typeof value !== "number") continue;
        resources[key] = (resources[key] ?? 0) + value * sign;
      }
    }
    if (typeof source.skill_points === "number") {
      merged.skill_points = (merged.skill_points ?? 0) + source.skill_points * sign;
    }
    if (source.dispositions) {
      merged.dispositions = merged.dispositions ?? {};
      for (const [key, value] of Object.entries(source.dispositions)) {
        if (typeof value !== "number") continue;
        merged.dispositions[key] = (merged.dispositions[key] ?? 0) + value * sign;
      }
    }
  };

  apply(costs, -1);
  apply(rewards, 1);
  merged.resources = resources;
  return merged;
}

function findOption(step: ArcStep, optionKey: string): ArcStepOption | null {
  return (step.options ?? []).find((option) => option.option_key === optionKey) ?? null;
}

export async function acceptOffer(params: {
  userId: string;
  currentDay: number;
  offerId: string;
}): Promise<void> {
  const { userId, currentDay, offerId } = params;
  const { data: offer, error } = await supabaseServer
    .from("arc_offers")
    .select(
      "id,user_id,arc_id,offer_key,state,times_shown,tone_level,first_seen_day,last_seen_day,expires_on_day"
    )
    .eq("id", offerId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !offer) {
    throw new Error("Offer not found.");
  }
  if (offer.state !== "ACTIVE") {
    throw new Error("Offer is not active.");
  }

  const steps = await fetchArcSteps(offer.arc_id);
  if (!steps.length) {
    throw new Error("Arc has no steps.");
  }
  const firstStep = steps[0];
  const dueDay = computeNextDueDay(currentDay, firstStep);

  const { data: instance, error: instanceError } = await supabaseServer
    .from("arc_instances")
    .insert({
      user_id: userId,
      arc_id: offer.arc_id,
      state: "ACTIVE",
      current_step_key: firstStep.step_key,
      step_due_day: dueDay,
      step_defer_count: 0,
      started_day: currentDay,
      updated_day: currentDay,
    })
    .select(
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason"
    )
    .maybeSingle();
  if (instanceError || !instance) {
    throw new Error("Failed to create arc instance.");
  }

  await supabaseServer
    .from("arc_offers")
    .update({ state: "ACCEPTED", updated_at: new Date().toISOString() })
    .eq("id", offerId);

  await logChoice({
    user_id: userId,
    day: currentDay,
    event_type: "ARC_STARTED",
    arc_id: offer.arc_id,
    arc_instance_id: (instance as ArcInstance).id,
    offer_id: offer.id,
    meta: { tone_level: offer.tone_level },
  });
}

export async function resolveStep(params: {
  userId: string;
  currentDay: number;
  arcInstanceId: string;
  optionKey: string;
  progressionSlotsTotal?: number;
}): Promise<void> {
  const { userId, currentDay, arcInstanceId, optionKey } = params;
  const progressionSlotsTotal = params.progressionSlotsTotal ?? DEFAULT_PROGRESS_SLOTS;

  const { data: instance, error } = await supabaseServer
    .from("arc_instances")
    .select(
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason"
    )
    .eq("id", arcInstanceId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !instance) throw new Error("Arc instance not found.");
  if (instance.state !== "ACTIVE") throw new Error("Arc is not active.");

  const steps = await fetchArcSteps(instance.arc_id);
  const step = steps.find((item) => item.step_key === instance.current_step_key);
  if (!step) throw new Error("Step not found.");
  const expiresOn = computeArcExpireDay(instance.step_due_day, step);
  if (currentDay > expiresOn) {
    throw new Error("Step expired.");
  }

  const { data: logCount } = await supabaseServer
    .from("choice_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("day", currentDay)
    .eq("event_type", "STEP_RESOLVED");
  const slotsUsed = logCount?.length ?? 0;
  if (!canProgressToday(slotsUsed, progressionSlotsTotal)) {
    throw new Error("No progression slots left today.");
  }

  const option = findOption(step, optionKey);
  if (!option) throw new Error("Option not found.");

  const arc = await fetchArcDefinition(instance.arc_id);
  const tags = arc?.tags ?? [];

  let combined = mergeDeltas(option.costs, option.rewards);
  for (const tag of tags) {
    const { data } = await supabaseServer
      .from("player_dispositions")
      .select("hesitation")
      .eq("user_id", userId)
      .eq("tag", tag)
      .limit(1)
      .maybeSingle();
    const hesitation = data?.hesitation ?? 0;
    combined = applyDispositionCost(tag, combined, hesitation);
  }

  if (combined.resources && Object.keys(combined.resources).length > 0) {
    await applyDeltaToDayState(userId, currentDay, combined);
  }
  if (combined.skill_points) {
    await applySkillPoints(userId, combined.skill_points);
  }
  if (combined.dispositions) {
    await applyDispositionDeltas(userId, combined.dispositions);
  }

  await logChoice({
    user_id: userId,
    day: currentDay,
    event_type: "STEP_RESOLVED",
    arc_id: instance.arc_id,
    arc_instance_id: instance.id,
    step_key: step.step_key,
    option_key: option.option_key,
    delta: combined,
  });

  const nextKey =
    option.next_step_key ?? step.default_next_step_key ?? null;
  if (!nextKey) {
    await supabaseServer
      .from("arc_instances")
      .update({
        state: "COMPLETED",
        updated_day: currentDay,
        completed_day: currentDay,
      })
      .eq("id", instance.id);
    await logChoice({
      user_id: userId,
      day: currentDay,
      event_type: "ARC_COMPLETED",
      arc_id: instance.arc_id,
      arc_instance_id: instance.id,
    });
    return;
  }

  const nextStep = steps.find((item) => item.step_key === nextKey);
  if (!nextStep) {
    await supabaseServer
      .from("arc_instances")
      .update({
        state: "COMPLETED",
        updated_day: currentDay,
        completed_day: currentDay,
      })
      .eq("id", instance.id);
    await logChoice({
      user_id: userId,
      day: currentDay,
      event_type: "ARC_COMPLETED",
      arc_id: instance.arc_id,
      arc_instance_id: instance.id,
    });
    return;
  }

  const nextDue = computeNextDueDay(currentDay, nextStep);
  await supabaseServer
    .from("arc_instances")
    .update({
      current_step_key: nextKey,
      step_due_day: nextDue,
      step_defer_count: 0,
      updated_day: currentDay,
    })
    .eq("id", instance.id);
}

export async function deferStep(params: {
  userId: string;
  currentDay: number;
  arcInstanceId: string;
}): Promise<void> {
  const { userId, currentDay, arcInstanceId } = params;
  const { data: instance, error } = await supabaseServer
    .from("arc_instances")
    .select(
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason"
    )
    .eq("id", arcInstanceId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !instance) throw new Error("Arc instance not found.");
  if (instance.state !== "ACTIVE") throw new Error("Arc is not active.");

  const steps = await fetchArcSteps(instance.arc_id);
  const step = steps.find((item) => item.step_key === instance.current_step_key);
  if (!step) throw new Error("Step not found.");

  const nextDefer = instance.step_defer_count + 1;
  const nextDue = instance.step_due_day + 1;
  const expiresOn = computeArcExpireDay(nextDue, step);

  if (nextDefer > step.expires_after_days || currentDay > expiresOn) {
    await supabaseServer
      .from("arc_instances")
      .update({
        state: "ABANDONED",
        updated_day: currentDay,
        completed_day: currentDay,
        failure_reason: "deferred",
      })
      .eq("id", instance.id);
    await logChoice({
      user_id: userId,
      day: currentDay,
      event_type: "ARC_ABANDONED",
      arc_id: instance.arc_id,
      arc_instance_id: instance.id,
      step_key: instance.current_step_key,
      meta: { reason: "deferred" },
    });
    const arc = await fetchArcDefinition(instance.arc_id);
    const tags = arc?.tags ?? [];
    await applyDispositionDeltas(
      userId,
      Object.fromEntries(tags.map((tag) => [tag, 1]))
    );
    return;
  }

  await supabaseServer
    .from("arc_instances")
    .update({
      step_defer_count: nextDefer,
      step_due_day: nextDue,
      updated_day: currentDay,
    })
    .eq("id", instance.id);

  await logChoice({
    user_id: userId,
    day: currentDay,
    event_type: "STEP_DEFERRED",
    arc_id: instance.arc_id,
    arc_instance_id: instance.id,
    step_key: instance.current_step_key,
    meta: { defer_count: nextDefer },
  });
}
