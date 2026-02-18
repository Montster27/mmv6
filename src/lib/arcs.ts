import { supabase } from "@/lib/supabase/browser";
import { fetchArcSteps } from "@/lib/content/arcs";
import { applyAlignmentDelta, ARC_CHOICE_ALIGNMENT_DELTAS } from "@/lib/alignment";
import { flagToVectorDeltas } from "@/core/vectors/flagToVectorDeltas";
import { applyOutcomeToDailyState } from "@/core/engine/applyOutcome";
import { fetchDailyState, updateDailyState } from "@/lib/play";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { toLegacyResourceUpdates } from "@/core/resources/resourceMap";
import { getFeatureFlags } from "@/lib/featureFlags";
import { ensureSkillBankUpToDate, fetchSkillBank } from "@/lib/dailyInteractions";
import type { ArcInstance } from "@/types/arcs";
import type { ContentArcStep } from "@/types/content";

export async function fetchArcInstance(
  userId: string,
  arcKey: string
): Promise<ArcInstance | null> {
  const { data, error } = await supabase
    .from("arc_instances")
    .select("id,user_id,arc_key,status,started_day_index,current_step,updated_at,meta")
    .eq("user_id", userId)
    .eq("arc_key", arcKey)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch arc instance", error);
    throw new Error("Failed to fetch arc instance.");
  }

  return data ?? null;
}

export async function fetchArcInstancesByKeys(
  userId: string,
  arcKeys: string[]
): Promise<ArcInstance[]> {
  if (arcKeys.length === 0) return [];
  const { data, error } = await supabase
    .from("arc_instances")
    .select("id,user_id,arc_key,status,started_day_index,current_step,updated_at,meta")
    .eq("user_id", userId)
    .in("arc_key", arcKeys);

  if (error) {
    console.error("Failed to fetch arc instances", error);
    throw new Error("Failed to fetch arc instances.");
  }

  return (data ?? []) as ArcInstance[];
}

export async function startArc(
  userId: string,
  arcKey: string,
  dayIndex: number
): Promise<ArcInstance> {
  const { data: existing, error: existingError } = await supabase
    .from("arc_instances")
    .select("id,user_id,arc_key,status,started_day_index,current_step,updated_at,meta")
    .eq("user_id", userId)
    .eq("arc_key", arcKey)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch arc instance", existingError);
    throw new Error("Failed to fetch arc instance.");
  }

  if (existing) return existing as ArcInstance;

  const { data: created, error: insertError } = await supabase
    .from("arc_instances")
    .insert({
      user_id: userId,
      arc_key: arcKey,
      status: "active",
      started_day_index: dayIndex,
      current_step: 0,
      updated_at: new Date().toISOString(),
    })
    .select("id,user_id,arc_key,status,started_day_index,current_step,updated_at,meta")
    .limit(1)
    .maybeSingle();

  if (insertError) {
    const { data: retry } = await supabase
      .from("arc_instances")
      .select("id,user_id,arc_key,status,started_day_index,current_step,updated_at,meta")
      .eq("user_id", userId)
      .eq("arc_key", arcKey)
      .limit(1)
      .maybeSingle();
    if (retry) return retry as ArcInstance;
    console.error("Failed to start arc", insertError);
    throw new Error("Failed to start arc.");
  }

  if (!created) {
    throw new Error("Failed to start arc.");
  }

  return created as ArcInstance;
}

export async function advanceArc(
  userId: string,
  arcKey: string,
  nextStep: number
): Promise<void> {
  const { data, error } = await supabase
    .from("arc_instances")
    .update({
      current_step: nextStep,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("arc_key", arcKey)
    .eq("status", "active")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to advance arc", error);
    throw new Error("Failed to advance arc.");
  }

  if (!data) {
    throw new Error("Arc is not active.");
  }
}

export async function completeArc(userId: string, arcKey: string): Promise<void> {
  const { data, error } = await supabase
    .from("arc_instances")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("arc_key", arcKey)
    .eq("status", "active")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to complete arc", error);
    throw new Error("Failed to complete arc.");
  }

  if (!data) {
    throw new Error("Arc is not active.");
  }
}

export async function fetchArcCurrentStepContent(
  arcKey: string,
  stepIndex: number
): Promise<ContentArcStep | null> {
  const steps = await fetchArcSteps(arcKey);
  return steps.find((step) => step.step_index === stepIndex) ?? null;
}

export async function applyArcChoiceFlags(
  userId: string,
  arcKey: string,
  choiceFlags?: Record<string, boolean>
): Promise<void> {
  if (!choiceFlags || Object.keys(choiceFlags).length === 0) return;

  const instance = await fetchArcInstance(userId, arcKey);
  if (!instance) {
    throw new Error("Arc not started.");
  }

  const metaBase =
    instance.meta && typeof instance.meta === "object" ? instance.meta : {};
  const baseFlags =
    metaBase && typeof (metaBase as any).flags === "object"
      ? (metaBase as any).flags
      : {};
  const nextMeta = {
    ...metaBase,
    flags: { ...baseFlags, ...choiceFlags },
  };

  const { data, error } = await supabase
    .from("arc_instances")
    .update({ meta: nextMeta, updated_at: new Date().toISOString() })
    .eq("id", instance.id)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to update arc flags", error);
    throw new Error("Failed to update arc.");
  }
  if (!data) {
    throw new Error("Failed to update arc.");
  }
}

async function applyArcChoiceCounters(
  userId: string,
  arcKey: string,
  counters?: Record<string, number>
): Promise<void> {
  if (!counters || Object.keys(counters).length === 0) return;

  const instance = await fetchArcInstance(userId, arcKey);
  if (!instance) {
    throw new Error("Arc not started.");
  }

  const metaBase =
    instance.meta && typeof instance.meta === "object" ? instance.meta : {};
  const baseCounters =
    metaBase && typeof (metaBase as any).counters === "object"
      ? (metaBase as any).counters
      : {};
  const nextCounters: Record<string, number> = { ...baseCounters };
  for (const [key, delta] of Object.entries(counters)) {
    if (typeof delta !== "number") continue;
    nextCounters[key] = (nextCounters[key] ?? 0) + delta;
  }
  const nextMeta = {
    ...metaBase,
    counters: nextCounters,
  };

  const { data, error } = await supabase
    .from("arc_instances")
    .update({ meta: nextMeta, updated_at: new Date().toISOString() })
    .eq("id", instance.id)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to update arc counters", error);
    throw new Error("Failed to update arc.");
  }
  if (!data) {
    throw new Error("Failed to update arc.");
  }
}

async function awardSkillPoints(userId: string, dayIndex: number, points: number) {
  if (!points || points <= 0) return;
  await ensureSkillBankUpToDate(userId, dayIndex);
  const bank = await fetchSkillBank(userId);
  if (!bank) return;
  const nextAvailable = bank.available_points + points;
  const cap = typeof bank.cap === "number" ? bank.cap : 10;
  const { error } = await supabase
    .from("skill_bank")
    .update({
      available_points: Math.min(cap, nextAvailable),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to award skill points", error);
  }
}

export async function progressArcWithChoice(
  userId: string,
  arcKey: string,
  choiceKey: string,
  dayIndex?: number
): Promise<void> {
  const instance = await fetchArcInstance(userId, arcKey);
  if (!instance) {
    throw new Error("Arc not started.");
  }
  if (instance.status !== "active") {
    throw new Error("Arc is not active.");
  }

  const steps = await fetchArcSteps(arcKey);
  const currentStep = steps.find((step) => step.step_index === instance.current_step);
  if (!currentStep) {
    throw new Error("Arc step missing.");
  }

  const choice = (currentStep.choices ?? []).find((item) => item.key === choiceKey);
  if (!choice) {
    throw new Error("Arc choice missing.");
  }

  const vectorFromChoice =
    choice.vector_deltas &&
    typeof choice.vector_deltas === "object" &&
    !Array.isArray(choice.vector_deltas)
      ? (choice.vector_deltas as Record<string, number>)
      : {};

  const hasResourceEffects = Boolean(choice.costs || choice.rewards);
  if (hasResourceEffects) {
    if (typeof dayIndex !== "number") {
      throw new Error("Day index required for arc choice.");
    }
    const featureFlags = getFeatureFlags();
    const dayState = await ensureDayStateUpToDate(userId, dayIndex);
    const costs = choice.costs ?? {};
    const rewards = choice.rewards ?? {};
    const effectiveCosts = featureFlags.resources
      ? costs
      : {
          energy: costs.energy ?? 0,
          stress: costs.stress ?? 0,
        };
    const effectiveRewards = featureFlags.resources
      ? rewards
      : {
          energy: rewards.energy ?? 0,
          stress: rewards.stress ?? 0,
        };
    const resourceBase = {
      cashOnHand: dayState.cashOnHand ?? 0,
      energy: dayState.energy ?? 0,
      stress: dayState.stress ?? 0,
      knowledge: dayState.knowledge ?? 0,
      socialLeverage: dayState.socialLeverage ?? 0,
      physicalResilience: dayState.physicalResilience ?? 0,
    };

    const affordabilityChecks: Array<[keyof typeof resourceBase, number]> = [
      ["cashOnHand", (effectiveCosts as any).cashOnHand ?? 0],
      ["energy", effectiveCosts.energy ?? 0],
      ["stress", effectiveCosts.stress ?? 0],
      ["knowledge", (effectiveCosts as any).knowledge ?? 0],
      ["socialLeverage", (effectiveCosts as any).socialLeverage ?? 0],
      ["physicalResilience", (effectiveCosts as any).physicalResilience ?? 0],
    ];
    for (const [key, value] of affordabilityChecks) {
      if (value > 0 && resourceBase[key] < value) {
        throw new Error(`INSUFFICIENT_RESOURCES:${key}`);
      }
    }

    const clamp100 = (value: number) => Math.max(0, Math.min(100, value));
    const nextResources = {
      cashOnHand:
        resourceBase.cashOnHand -
        ((effectiveCosts as any).cashOnHand ?? 0) +
        ((effectiveRewards as any).cashOnHand ?? 0),
      energy: clamp100(
        resourceBase.energy -
          (effectiveCosts.energy ?? 0) +
          (effectiveRewards.energy ?? 0)
      ),
      stress: clamp100(
        resourceBase.stress -
          (effectiveCosts.stress ?? 0) +
          (effectiveRewards.stress ?? 0)
      ),
      knowledge:
        resourceBase.knowledge -
        ((effectiveCosts as any).knowledge ?? 0) +
        ((effectiveRewards as any).knowledge ?? 0),
      socialLeverage:
        resourceBase.socialLeverage -
        ((effectiveCosts as any).socialLeverage ?? 0) +
        ((effectiveRewards as any).socialLeverage ?? 0),
      physicalResilience: clamp100(
        resourceBase.physicalResilience -
          ((effectiveCosts as any).physicalResilience ?? 0) +
          ((effectiveRewards as any).physicalResilience ?? 0)
      ),
    };

    const { error: updateError } = await supabase
      .from("player_day_state")
      .update({
        ...toLegacyResourceUpdates(nextResources),
        energy: nextResources.energy,
        stress: nextResources.stress,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("day_index", dayIndex);

    if (updateError) {
      console.error("Failed to apply arc choice costs/rewards", updateError);
      throw new Error("Failed to apply arc choice.");
    }

    const daily = await fetchDailyState(userId);
    if (daily) {
      const { nextDailyState } = applyOutcomeToDailyState(daily, {
        deltas: { vectors: vectorFromChoice },
        text: "",
      } as any);
      await updateDailyState(userId, {
        energy: nextResources.energy,
        stress: nextResources.stress,
        vectors: nextDailyState.vectors,
      });
    }
  }

  await applyArcChoiceFlags(userId, arcKey, choice.flags);
  await applyArcChoiceCounters(userId, arcKey, choice.counters);
  if (typeof dayIndex === "number") {
    await awardSkillPoints(userId, dayIndex, choice.skill_points ?? 0);
  }

  const alignmentDelta = ARC_CHOICE_ALIGNMENT_DELTAS[choiceKey];
  if (alignmentDelta && typeof dayIndex === "number") {
    await applyAlignmentDelta({
      userId,
      dayIndex,
      factionKey: alignmentDelta.factionKey,
      delta: alignmentDelta.delta,
      source: "arc_choice",
      sourceRef: `${arcKey}:${instance.current_step}:${choiceKey}`,
    });
  }

  if (!hasResourceEffects) {
    const vectorDeltas = {
      ...flagToVectorDeltas(choice.flags),
      ...vectorFromChoice,
    };
    if (Object.keys(vectorDeltas).length > 0) {
      const daily = await fetchDailyState(userId);
      if (daily) {
        const { nextDailyState } = applyOutcomeToDailyState(daily, {
          deltas: { vectors: vectorDeltas },
          text: "",
        } as any);
        await updateDailyState(userId, {
          energy: nextDailyState.energy,
          stress: nextDailyState.stress,
          vectors: nextDailyState.vectors,
        });
      }
    }
  }

  const nextStep =
    typeof choice.next_step_index === "number"
      ? choice.next_step_index
      : instance.current_step + 1;
  if (nextStep >= steps.length) {
    const { data, error } = await supabase
      .from("arc_instances")
      .update({
        current_step: nextStep,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("arc_key", arcKey)
      .eq("status", "active")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to complete arc", error);
      throw new Error("Failed to complete arc.");
    }

    if (!data) {
      throw new Error("Arc is not active.");
    }

    return;
  }

  await advanceArc(userId, arcKey, nextStep);
}

export async function getOrStartArc(
  userId: string,
  arcKey: string,
  dayIndex: number
): Promise<ArcInstance> {
  return startArc(userId, arcKey, dayIndex);
}

export async function advanceArcStep(
  userId: string,
  arcKey: string,
  nextStep: number
): Promise<void> {
  return advanceArc(userId, arcKey, nextStep);
}
