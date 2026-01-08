import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

export function getAdminClient() {
  return supabaseServer;
}
