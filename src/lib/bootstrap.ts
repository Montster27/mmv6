import { supabase } from "@/lib/supabaseClient";

type EnsureResult = { userId: string };

export async function ensurePlayerSetup(): Promise<EnsureResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No authenticated user found.");
  }

  const userId = user.id;
  const email = user.email ?? null;
  const displayName = `Player-${userId.slice(0, 6)}`;

  // Ensure profile
  await supabase
    .from("profiles")
    .upsert({ id: userId, email }, { onConflict: "id" });

  // Ensure character
  const { data: characterExisting } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!characterExisting) {
    await supabase.from("characters").insert({
      user_id: userId,
      name: null,
    });
  }

  // Ensure daily_state
  const { data: dailyExisting } = await supabase
    .from("daily_states")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!dailyExisting) {
    await supabase.from("daily_states").insert({
      user_id: userId,
    });
  }

  // Ensure public profile (do not overwrite if exists)
  const { data: publicProfileExisting } = await supabase
    .from("public_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!publicProfileExisting) {
    await supabase.from("public_profiles").insert({
      user_id: userId,
      display_name: displayName,
    });
  }

  return { userId };
}
