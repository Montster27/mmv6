import { supabase } from "@/lib/supabaseClient";
import type { Reflection, ReflectionResponse } from "@/types/reflections";

const PROMPT_ID = "clarity_v1";

export async function getReflection(
  userId: string,
  dayIndex: number
): Promise<Reflection | null> {
  const { data, error } = await supabase
    .from("reflections")
    .select("id,user_id,day_index,prompt_id,response,skipped,created_at,updated_at")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch reflection", error);
    return null;
  }

  return data ?? null;
}

export async function upsertReflection(
  userId: string,
  dayIndex: number,
  payload:
    | { response: ReflectionResponse; skipped?: false }
    | { skipped: true; response?: null }
): Promise<void> {
  const insertPayload = {
    user_id: userId,
    day_index: dayIndex,
    prompt_id: PROMPT_ID,
    response: "response" in payload ? payload.response : null,
    skipped: Boolean(payload.skipped),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("reflections").upsert(insertPayload, {
    onConflict: "user_id,day_index",
  });

  if (error) {
    console.error("Failed to upsert reflection", error);
    throw error;
  }
}

export function isReflectionDone(reflection: Reflection | null): boolean {
  if (!reflection) return false;
  if (reflection.skipped) return true;
  const allowed = new Set<ReflectionResponse>(["yes", "mostly", "no"]);
  return reflection.response ? allowed.has(reflection.response as ReflectionResponse) : false;
}
