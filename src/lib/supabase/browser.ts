import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL for Supabase client.");
}

if (!supabaseAnonKey) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase client.");
}

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

assertAnonKeyIsNotServiceRole(supabaseAnonKey);

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = supabaseBrowser;
