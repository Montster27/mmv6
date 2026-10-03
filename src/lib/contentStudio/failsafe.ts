import { supabase } from "@/lib/supabase/browser";

export async function fetchPublishedContentSnapshot() {
  const [storylets, consequences] = await Promise.all([
    supabase.rpc("runtime_storylets"), supabase.rpc("runtime_consequences"),
  ]);
  if (storylets.error || consequences.error) return null;
  return { storylets: storylets.data, consequences: consequences.data };
}
