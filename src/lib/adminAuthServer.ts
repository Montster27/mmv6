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

/**
 * Check if user can access Content Studio.
 * Allows access for admins OR users with test_mode enabled.
 */
export async function canAccessContentStudio(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  // Check admin status first
  if (await isUserAdmin(user)) return true;

  // Check test_mode from player_experiments
  const { data, error } = await supabaseServer
    .from("player_experiments")
    .select("config")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check test_mode", error);
    return false;
  }

  const config = data?.config as Record<string, unknown> | null;
  const devSettings = config?.dev_settings as Record<string, unknown> | null;
  return Boolean(devSettings?.test_mode);
}
