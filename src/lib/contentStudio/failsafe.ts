import { supabase } from "@/lib/supabase/browser";

export async function fetchPublishedContentSnapshot() {
  const { data, error } = await supabase
    .from("content_versions")
    .select("snapshot")
    .eq("state", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load published content snapshot", error);
    return null;
  }
  return data?.snapshot ?? null;
}
