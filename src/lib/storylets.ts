import { supabase } from "@/lib/supabaseClient";
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

  // Keep choices/body if needed downstream; no coercion here.
  return data ?? [];
}
