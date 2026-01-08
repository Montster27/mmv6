import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL for Supabase admin client.");
}

export function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL for Supabase admin client.");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY for admin operations.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
