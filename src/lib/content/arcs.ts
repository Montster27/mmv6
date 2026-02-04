import { supabase } from "@/lib/supabase/browser";
import type { ContentArc, ContentArcStep, ContentArcStepChoice } from "@/types/content";
import { mapLegacyResourceKey } from "@/core/resources/resourceMap";

function normalizeChoice(choice: ContentArcStepChoice): ContentArcStepChoice {
  const normalizeCosts = (input?: Record<string, number>) => {
    if (!input) return undefined;
    const output: Record<string, number> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value !== "number") continue;
      if (key === "energy" || key === "stress") {
        output[key] = value;
        continue;
      }
      const mapped = mapLegacyResourceKey(key) ?? key;
      output[mapped] = (output[mapped] ?? 0) + value;
    }
    return output;
  };

  return {
    ...choice,
    costs: normalizeCosts(choice.costs as Record<string, number> | undefined),
    rewards: normalizeCosts(choice.rewards as Record<string, number> | undefined),
  };
}

export async function listActiveArcs(): Promise<ContentArc[]> {
  const { data, error } = await supabase
    .from("content_arcs")
    .select("key,title,description,tags,is_active,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load content arcs", error);
    throw new Error("Failed to load content arcs.");
  }

  return data ?? [];
}

export async function fetchArcByKey(key: string): Promise<ContentArc | null> {
  const { data, error } = await supabase
    .from("content_arcs")
    .select("key,title,description,tags,is_active,created_at")
    .eq("key", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch content arc", error);
    throw new Error("Failed to fetch content arc.");
  }

  return data ?? null;
}

export async function fetchArcSteps(arcKey: string): Promise<ContentArcStep[]> {
  const { data, error } = await supabase
    .from("content_arc_steps")
    .select("arc_key,step_index,title,body,choices,created_at")
    .eq("arc_key", arcKey)
    .order("step_index", { ascending: true });

  if (error) {
    console.error("Failed to fetch content arc steps", error);
    throw new Error("Failed to fetch content arc steps.");
  }

  return (data ?? []).map((step) => ({
    ...step,
    choices: Array.isArray(step.choices)
      ? step.choices.map((choice: ContentArcStepChoice) => normalizeChoice(choice))
      : [],
  })) as ContentArcStep[];
}

export async function fetchArcWithSteps(
  arcKey: string
): Promise<{ arc: ContentArc; steps: ContentArcStep[] } | null> {
  const arc = await fetchArcByKey(arcKey);
  if (!arc) return null;
  const steps = await fetchArcSteps(arcKey);
  return { arc, steps };
}
