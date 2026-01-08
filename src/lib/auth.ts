import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/browser";

export async function getSessionClientSide(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Failed to get session", error);
    return null;
  }
  return data.session ?? null;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Failed to sign out", error);
  }
}
