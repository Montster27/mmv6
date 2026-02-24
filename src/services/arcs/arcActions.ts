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
import { getFeatureFlags } from "@/lib/featureFlags";
import { ARC_ONE_ARC_KEYS, ARC_ONE_LAST_DAY } from "@/core/arcOne/constants";
import { mapArcTagsToOpportunity, mapTagsToIdentity, shouldFlagIdentity } from "@/core/arcOne/mapping";
import {
  appendExpired,
  applyMoneyEffect,
  bumpEnergyLevelFromEnergy,
  canSpendMoney,
  fetchArcOneState,
  parseSkillRequirement,
  updateArcOneState,
} from "@/services/arcOne/state";
import { bumpLifePressure, updateNpcMemory, updateSkillFlag } from "@/core/arcOne/state";
import type { ExpiredOpportunity } from "@/core/arcOne/types";

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
  const featureFlags = getFeatureFlags();
  const arcOneMode =
    featureFlags.arcOneScarcityEnabled &&
    featureFlags.arcFirstEnabled &&
    currentDay <= ARC_ONE_LAST_DAY;
  const progressionSlotsTotal =
    params.progressionSlotsTotal ??
    (arcOneMode ? 3 : DEFAULT_PROGRESS_SLOTS);

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

  const option = findOption(step, optionKey);
  if (!option) throw new Error("Option not found.");
  const timeCost = Math.max(1, option.time_cost ?? 1);

  const arc = await fetchArcDefinition(instance.arc_id);
  const arcKey = arc?.key ?? "";
  const arcOneEnabled = arcOneMode && ARC_ONE_ARC_KEYS.has(arcKey);
  const arcOneState = arcOneEnabled ? await fetchArcOneState(userId) : null;
  if (arcOneEnabled && arcOneState) {
    if (!canSpendMoney(arcOneState.moneyBand, option.money_requirement)) {
      throw new Error("Money is too tight for that.");
    }
    const requirement = parseSkillRequirement(option.skill_requirement);
    if (
      requirement &&
      (arcOneState.skillFlags[requirement.key] ?? 0) < requirement.min
    ) {
      throw new Error("Skill requirement not met.");
    }
  }

  const { data: logRows, error: logError } = await supabaseServer
    .from("choice_log")
    .select("meta")
    .eq("user_id", userId)
    .eq("day", currentDay)
    .eq("event_type", "STEP_RESOLVED");
  if (logError) {
    console.error("Failed to load progression count", logError);
  }
  const slotsUsed = (logRows ?? []).reduce((sum, row) => {
    const meta = row?.meta as Record<string, unknown> | null;
    const cost = typeof meta?.time_cost === "number" ? meta?.time_cost : 1;
    return sum + cost;
  }, 0);
  if (!canProgressToday(slotsUsed, progressionSlotsTotal, timeCost)) {
    throw new Error("No progression slots left today.");
  }

  const tags = arc?.tags ?? [];
  const hesitationSnapshot: Record<string, number> = {};

  let combined = mergeDeltas(option.costs, option.rewards);
  let energyCost = typeof option.energy_cost === "number" ? option.energy_cost : 0;
  if (arcOneEnabled && arcOneState && option.skill_modifier) {
    const key = option.skill_modifier as keyof typeof arcOneState.skillFlags;
    if (key in arcOneState.skillFlags && arcOneState.skillFlags[key] >= 2) {
      // TODO(arc-one): tune skill-based energy efficiency.
      energyCost = Math.max(0, energyCost - 1);
    }
  }
  if (energyCost !== 0) {
    combined.resources = combined.resources ?? {};
    combined.resources.energy = (combined.resources.energy ?? 0) - energyCost;
  }
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

  let resourceSnapshot = null as Awaited<ReturnType<typeof applyResourceDelta>> | null;
  if (
    (combined.resources && Object.keys(combined.resources).length > 0) ||
    typeof combined.skill_points === "number"
  ) {
    resourceSnapshot = await applyResourceDelta(userId, currentDay, combined, {
      source: "arc_step_resolved",
      arcId: arc?.id ?? null,
      arcInstanceId: instance.id,
      stepKey: step.step_key,
      optionKey: option.option_key,
      meta: {
        hesitation_snapshot: hesitationSnapshot,
        branch_key: nextBranchKey,
        time_cost: timeCost,
      },
    });
  }

  if (arcOneEnabled && arcOneState) {
    const identityTags =
      option.identity_tags && option.identity_tags.length > 0
        ? option.identity_tags
        : mapTagsToIdentity(tags);
    const normalizedTags = identityTags.filter((tag) => shouldFlagIdentity(tag));
    const nextLifePressure = bumpLifePressure(
      arcOneState.lifePressureState,
      normalizedTags
    );
    const nextMoneyBand = applyMoneyEffect(
      arcOneState.moneyBand,
      option.money_effect
    );
    let nextSkillFlags = arcOneState.skillFlags;
    if (option.skill_modifier) {
      const key = option.skill_modifier as keyof typeof arcOneState.skillFlags;
      if (key in arcOneState.skillFlags) {
        nextSkillFlags = updateSkillFlag(arcOneState.skillFlags, key);
      }
    }
    let nextNpcMemory = arcOneState.npcMemory;
    if (option.relational_effects?.npc_key) {
      nextNpcMemory = updateNpcMemory(
        arcOneState.npcMemory,
        option.relational_effects.npc_key,
        {
          trust: option.relational_effects.trust_delta,
          reliability: option.relational_effects.reliability_delta,
          emotionalLoad: option.relational_effects.emotionalLoad_delta,
        }
      );
    }
    const nextEnergyLevel = resourceSnapshot
      ? bumpEnergyLevelFromEnergy(resourceSnapshot.energy)
      : arcOneState.energyLevel;
    await updateArcOneState(userId, {
      lifePressureState: nextLifePressure,
      moneyBand: nextMoneyBand,
      skillFlags: nextSkillFlags,
      npcMemory: nextNpcMemory,
      energyLevel: nextEnergyLevel,
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
      time_cost: timeCost,
    },
  });

  const nextSlotsUsed = slotsUsed + timeCost;
  if (arcOneEnabled && arcOneState && nextSlotsUsed >= progressionSlotsTotal) {
    const { data: dueInstances } = await supabaseServer
      .from("arc_instances")
      .select("id,arc_id,current_step_key,step_due_day")
      .eq("user_id", userId)
      .eq("state", "ACTIVE")
      .lte("step_due_day", currentDay);
    const remaining = (dueInstances ?? []).filter(
      (row) => row.id !== instance.id
    );
    if (remaining.length > 0) {
      const arcIds = Array.from(new Set(remaining.map((row) => row.arc_id)));
      const { data: arcRows } = await supabaseServer
        .from("arc_definitions")
        .select("id,tags")
        .in("id", arcIds);
      const tagMap = new Map(
        (arcRows ?? []).map((row) => [row.id, row.tags as string[]])
      );
      const expired = remaining.map<ExpiredOpportunity>((row) => ({
        type: mapArcTagsToOpportunity(tagMap.get(row.arc_id) ?? []),
        day_index: currentDay,
      }));
      await updateArcOneState(userId, {
        expiredOpportunities: appendExpired(
          arcOneState.expiredOpportunities,
          expired
        ),
      });
    }
  }
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
