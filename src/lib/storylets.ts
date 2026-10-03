import { supabase } from "@/lib/supabase/browser";
import {
  coerceStoryletRow,
  validateStorylet,
} from "@/core/validation/storyletValidation";
import type { Storylet } from "@/types/storylets";

export type StoryletListItem = Storylet;

export async function fetchActiveStorylets(): Promise<Storylet[]> {
  const { data, error } = await supabase
    .rpc("runtime_storylets")
    .select("id,slug,title,is_active,choices,body,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true }).returns<Storylet[]>();

  if (error) {
    console.error("Failed to fetch storylets", error);
    return [];
  }

  return (
    (Array.isArray(data) ? data : []).flatMap((row) => {
      const coerced = coerceStoryletRow(row);
      const validated = validateStorylet(coerced);
      if (validated.ok) return [validated.value];
      console.warn("Invalid storylet row; skipping", validated.errors);
      return [];
    }) ?? []
  );
}
