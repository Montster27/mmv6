import { supabase } from "@/lib/supabase/browser";
import { fetchArcSteps } from "@/lib/content/arcs";
import { applyAlignmentDelta, ARC_CHOICE_ALIGNMENT_DELTAS } from "@/lib/alignment";
import { flagToVectorDeltas } from "@/core/vectors/flagToVectorDeltas";
import { applyOutcomeToDailyState } from "@/core/engine/applyOutcome";
import { fetchDailyState, updateDailyState } from "@/lib/play";
import { ensureDayStateUpToDate } from "@/lib/dayState";
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

  if (choice.costs || choice.rewards) {
    if (typeof dayIndex !== "number") {
      throw new Error("Day index required for arc choice.");
    }
    const dayState = await ensureDayStateUpToDate(userId, dayIndex);
    const costs = choice.costs ?? {};
    const rewards = choice.rewards ?? {};
    const resourceBase = {
      money: dayState.money ?? 0,
      energy: dayState.energy ?? 0,
      stress: dayState.stress ?? 0,
      study_progress: dayState.study_progress ?? 0,
      social_capital: dayState.social_capital ?? 0,
      health: dayState.health ?? 0,
    };

    const affordabilityChecks: Array<[keyof typeof resourceBase, number]> = [
      ["money", costs.money ?? 0],
      ["energy", costs.energy ?? 0],
      ["stress", costs.stress ?? 0],
      ["study_progress", costs.study_progress ?? 0],
      ["social_capital", costs.social_capital ?? 0],
      ["health", costs.health ?? 0],
    ];
    for (const [key, value] of affordabilityChecks) {
      if (value > 0 && resourceBase[key] < value) {
        throw new Error(`INSUFFICIENT_RESOURCES:${key}`);
      }
    }

    const clamp100 = (value: number) => Math.max(0, Math.min(100, value));
    const nextResources = {
      money: resourceBase.money - (costs.money ?? 0) + (rewards.money ?? 0),
      energy: clamp100(
        resourceBase.energy - (costs.energy ?? 0) + (rewards.energy ?? 0)
      ),
      stress: clamp100(
        resourceBase.stress - (costs.stress ?? 0) + (rewards.stress ?? 0)
      ),
      study_progress:
        resourceBase.study_progress -
        (costs.study_progress ?? 0) +
        (rewards.study_progress ?? 0),
      social_capital:
        resourceBase.social_capital -
        (costs.social_capital ?? 0) +
        (rewards.social_capital ?? 0),
      health: clamp100(
        resourceBase.health - (costs.health ?? 0) + (rewards.health ?? 0)
      ),
    };

    const { error: updateError } = await supabase
      .from("player_day_state")
      .update({
        money: nextResources.money,
        energy: nextResources.energy,
        stress: nextResources.stress,
        study_progress: nextResources.study_progress,
        social_capital: nextResources.social_capital,
        health: nextResources.health,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("day_index", dayIndex);

    if (updateError) {
      console.error("Failed to apply arc choice costs/rewards", updateError);
      throw new Error("Failed to apply arc choice.");
    }

    if (
      nextResources.energy !== resourceBase.energy ||
      nextResources.stress !== resourceBase.stress
    ) {
      const daily = await fetchDailyState(userId);
      if (daily) {
        await updateDailyState(userId, {
          energy: nextResources.energy,
          stress: nextResources.stress,
          vectors: daily.vectors,
        });
      }
    }
  }

  await applyArcChoiceFlags(userId, arcKey, choice.flags);

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

  const vectorDeltas = flagToVectorDeltas(choice.flags);
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

  const nextStep = instance.current_step + 1;
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
