import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function assertAnonKeyIsNotServiceRole(key: string) {
  if (typeof window === "undefined") return;
  const payloadSegment = key.split(".")[1];
  if (!payloadSegment) return;
  try {
    const decoded = JSON.parse(window.atob(payloadSegment));
    if (decoded?.role === "service_role") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be a service role key—fix Vercel env vars."
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("service role key")) {
      throw error;
    }
  }
}

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL for Supabase client.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase client.");
  }

  assertAnonKeyIsNotServiceRole(supabaseAnonKey);
  cached = createClient(supabaseUrl, supabaseAnonKey);
  return cached;
}

// Preserve the existing import-time API surface (`supabase.from(...)`, etc.)
// without actually constructing the client until something reaches in. Test
// files that import modules transitively depending on this no longer crash at
// collection when env vars are absent.
const proxy = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, prop) {
    return prop in getClient();
  },
});

export const supabaseBrowser = proxy;
export const supabase = proxy;
