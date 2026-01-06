import { supabase } from "@/lib/supabaseClient";

export type StoryletListItem = {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
};

export async function fetchActiveStorylets(): Promise<StoryletListItem[]> {
  const { data, error } = await supabase
    .from("storylets")
    .select("id,slug,title,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch storylets", error);
    return [];
  }

  return data ?? [];
}
