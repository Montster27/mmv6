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
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, email }, { onConflict: "id" });
  if (profileError) {
    throw profileError;
  }

  // Ensure character
  const { data: characterExisting } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!characterExisting) {
    const { error: characterError } = await supabase.from("characters").insert({
      user_id: userId,
      name: null,
    });
    if (characterError) {
      const { data: characterRetry } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!characterRetry) {
        throw characterError;
      }
    }
  }

  // Ensure daily_state
  const { data: dailyExisting } = await supabase
    .from("daily_states")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!dailyExisting) {
    const { error: dailyError } = await supabase.from("daily_states").insert({
      user_id: userId,
    });
    if (dailyError) {
      const { data: dailyRetry } = await supabase
        .from("daily_states")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!dailyRetry) {
        throw dailyError;
      }
    }
  }

  // Ensure public profile (do not overwrite if exists)
  const { data: publicProfileExisting } = await supabase
    .from("public_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!publicProfileExisting) {
    const { error: publicProfileError } = await supabase
      .from("public_profiles")
      .insert({
      user_id: userId,
      display_name: displayName,
    });
    if (publicProfileError) {
      const { data: publicProfileRetry } = await supabase
        .from("public_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!publicProfileRetry) {
        throw publicProfileError;
      }
    }
  }

  return { userId };
}
