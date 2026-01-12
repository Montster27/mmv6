import "server-only";

import { isEmailAllowed } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase/server";

export async function isUserAdmin(user: { id: string; email?: string | null }) {
  if (isEmailAllowed(user.email)) return true;
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to check admin flag", error);
    return false;
  }
  return Boolean(data?.is_admin);
}
