import { supabase } from "@/lib/supabase/browser";
import { fetchArcSteps } from "@/lib/content/arcs";
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
  choiceKey: string
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

  await applyArcChoiceFlags(userId, arcKey, choice.flags);

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
