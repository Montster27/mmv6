import { supabase } from "@/lib/supabase/browser";
import type { Arc, ArcInstance } from "@/types/arcs";

export async function listActiveArcs(): Promise<Arc[]> {
  const { data, error } = await supabase
    .from("arcs")
    .select("id,key,title,description,created_at,is_active,meta")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load arcs", error);
    return [];
  }

  return data ?? [];
}

export async function fetchArcByKey(arcKey: string): Promise<Arc | null> {
  const { data, error } = await supabase
    .from("arcs")
    .select("id,key,title,description,created_at,is_active,meta")
    .eq("key", arcKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch arc by key", error);
    return null;
  }

  return data ?? null;
}

export async function fetchArcInstance(
  userId: string,
  arcId: string
): Promise<ArcInstance | null> {
  const { data, error } = await supabase
    .from("arc_instances")
    .select("id,user_id,arc_id,status,started_day_index,current_step,updated_at,meta")
    .eq("user_id", userId)
    .eq("arc_id", arcId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch arc instance", error);
    return null;
  }

  return data ?? null;
}

export async function getOrStartArc(
  userId: string,
  arcKey: string,
  dayIndex: number
): Promise<ArcInstance | null> {
  const { data: arc, error: arcError } = await supabase
    .from("arcs")
    .select("id,key")
    .eq("key", arcKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (arcError) {
    console.error("Failed to fetch arc", arcError);
    return null;
  }

  if (!arc) return null;

  const { data: existing, error: existingError } = await supabase
    .from("arc_instances")
    .select("id,user_id,arc_id,status,started_day_index,current_step,updated_at,meta")
    .eq("user_id", userId)
    .eq("arc_id", arc.id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch arc instance", existingError);
    return null;
  }

  if (existing) return existing as ArcInstance;

  const { data: created, error: createError } = await supabase
    .from("arc_instances")
    .insert({
      user_id: userId,
      arc_id: arc.id,
      status: "active",
      started_day_index: dayIndex,
      current_step: 0,
      updated_at: new Date().toISOString(),
    })
    .select("id,user_id,arc_id,status,started_day_index,current_step,updated_at,meta")
    .limit(1)
    .maybeSingle();

  if (createError) {
    console.error("Failed to start arc", createError);
    return null;
  }

  return created ?? null;
}

export async function advanceArcStep(
  userId: string,
  arcKey: string,
  nextStep: number,
  dayIndex: number
): Promise<void> {
  const { data: arc } = await supabase
    .from("arcs")
    .select("id")
    .eq("key", arcKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!arc?.id) {
    throw new Error("Arc not found.");
  }

  const { error } = await supabase
    .from("arc_instances")
    .update({
      current_step: nextStep,
      updated_at: new Date().toISOString(),
      status: "active",
      meta: { last_day_index: dayIndex },
    })
    .eq("user_id", userId)
    .eq("arc_id", arc.id);

  if (error) {
    console.error("Failed to advance arc", error);
    throw error;
  }
}

export async function completeArc(
  userId: string,
  arcKey: string,
  dayIndex: number
): Promise<void> {
  const { data: arc } = await supabase
    .from("arcs")
    .select("id")
    .eq("key", arcKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!arc?.id) {
    throw new Error("Arc not found.");
  }

  const { error } = await supabase
    .from("arc_instances")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
      meta: { last_day_index: dayIndex },
    })
    .eq("user_id", userId)
    .eq("arc_id", arc.id);

  if (error) {
    console.error("Failed to complete arc", error);
    throw error;
  }
}
