import { supabase } from "@/lib/supabaseClient";
import {
  coerceStoryletRow,
  fallbackStorylet,
  validateStorylet,
} from "@/core/validation/storyletValidation";
import type { Storylet } from "@/types/storylets";

export type StoryletListItem = Storylet;

export async function fetchActiveStorylets(): Promise<Storylet[]> {
  const { data, error } = await supabase
    .from("storylets")
    .select("id,slug,title,is_active,choices,body,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch storylets", error);
    return [];
  }

  return (
    data?.map((row) => {
      const coerced = coerceStoryletRow(row);
      const validated = validateStorylet(coerced);
      if (validated.ok) return validated.value;
      console.warn("Invalid storylet row; using fallback", validated.errors);
      return fallbackStorylet();
    }) ?? []
  );
}
