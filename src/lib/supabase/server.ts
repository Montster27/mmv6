import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("supabaseServer imported in browser");
}

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL for Supabase server client.");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY for Supabase server client.");
  }

  cached = createClient(supabaseUrl, serviceRoleKey);
  return cached;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
