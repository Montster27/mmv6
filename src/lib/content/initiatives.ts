import { supabase } from "@/lib/supabase/browser";
import type { ContentInitiative } from "@/types/content";

export async function listActiveInitiativesCatalog(): Promise<ContentInitiative[]> {
  const { data, error } = await supabase
    .from("content_initiatives")
    .select("key,title,description,goal,duration_days,tags,is_active,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load content initiatives", error);
    throw new Error("Failed to load content initiatives.");
  }

  return data ?? [];
}

export async function fetchInitiativeCatalogByKey(
  key: string
): Promise<ContentInitiative | null> {
  const { data, error } = await supabase
    .from("content_initiatives")
    .select("key,title,description,goal,duration_days,tags,is_active,created_at")
    .eq("key", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch content initiative", error);
    throw new Error("Failed to fetch content initiative.");
  }

  return data ?? null;
}
