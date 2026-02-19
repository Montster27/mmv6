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
import { applyResourceDelta } from "@/services/resources/resourceService";

const DEFAULT_PROGRESS_SLOTS = 2;
const BRANCH_REGEX = /^branch_(a|b|c)/i;

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function deriveBranchKey(nextKey: string | null): string | null {
  if (!nextKey) return null;
  const match = nextKey.match(BRANCH_REGEX);
  if (!match) return null;
  const token = match[1]?.toLowerCase();
  if (token === "a") return "A";
  if (token === "b") return "B";
  if (token === "c") return "C";
  return null;
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

function mergeDeltas(costs?: ResourceDelta, rewards?: ResourceDelta): ResourceDelta {
  const merged: ResourceDelta = {};
  const resources: Record<string, number> = {};

  const apply = (source?: ResourceDelta, sign: number = 1, absolute = false) => {
    if (!source) return;
    if (source.resources) {
      for (const [key, value] of Object.entries(source.resources)) {
        if (typeof value !== "number") continue;
        const nextValue = absolute ? Math.abs(value) : value;
        resources[key] = (resources[key] ?? 0) + nextValue * sign;
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

  apply(costs, -1, true);
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
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason,branch_key"
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
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason,branch_key"
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
  const hesitationSnapshot: Record<string, number> = {};

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
    hesitationSnapshot[tag] = hesitation;
    combined = applyDispositionCost(tag, combined, hesitation);
  }

  if (combined.dispositions) {
    await applyDispositionDeltas(userId, combined.dispositions);
  }

  const nextKey =
    option.next_step_key ?? step.default_next_step_key ?? null;
  const derivedBranchKey = deriveBranchKey(nextKey);
  const nextBranchKey =
    instance.branch_key ?? derivedBranchKey ?? null;

  if (
    (combined.resources && Object.keys(combined.resources).length > 0) ||
    typeof combined.skill_points === "number"
  ) {
    await applyResourceDelta(userId, currentDay, combined, {
      source: "arc_step_resolved",
      arcId: arc?.id ?? null,
      arcInstanceId: instance.id,
      stepKey: step.step_key,
      optionKey: option.option_key,
      meta: {
        hesitation_snapshot: hesitationSnapshot,
        branch_key: nextBranchKey,
      },
    });
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
    meta: {
      branch_key: nextBranchKey,
      hesitation_snapshot: hesitationSnapshot,
      tone_level_if_offer: null,
    },
  });
  if (!nextKey) {
    await supabaseServer
      .from("arc_instances")
      .update({
        state: "COMPLETED",
        branch_key: nextBranchKey,
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
      meta: { branch_key: nextBranchKey },
    });
    return;
  }

  const nextStep = steps.find((item) => item.step_key === nextKey);
  if (!nextStep) {
    await supabaseServer
      .from("arc_instances")
      .update({
        state: "COMPLETED",
        branch_key: nextBranchKey,
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
      meta: { branch_key: nextBranchKey },
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
      branch_key: nextBranchKey,
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
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason,branch_key"
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
    await applyResourceDelta(
      userId,
      currentDay,
      { resources: { stress: 1 } },
      {
        source: "arc_abandoned_penalty",
        arcId: instance.arc_id,
        arcInstanceId: instance.id,
        stepKey: instance.current_step_key,
        meta: { reason: "deferred_expired" },
      }
    );
    await logChoice({
      user_id: userId,
      day: currentDay,
      event_type: "ARC_ABANDONED",
      arc_id: instance.arc_id,
      arc_instance_id: instance.id,
      step_key: instance.current_step_key,
      meta: {
        reason: "deferred",
        branch_key: instance.branch_key ?? null,
        defer_count: nextDefer,
      },
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
