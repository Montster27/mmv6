import { supabase } from "@/lib/supabase/browser";

export type DevSettings = {
  test_mode: boolean;
};

const DEFAULT_SETTINGS: DevSettings = {
  test_mode: false,
};

function coerceSettings(raw: unknown): DevSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    test_mode: Boolean(obj.test_mode),
  };
}

export async function fetchDevSettings(userId: string): Promise<DevSettings> {
  const { data, error } = await supabase
    .from("player_experiments")
    .select("config")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load dev settings", error);
    return { ...DEFAULT_SETTINGS };
  }
  const config =
    data?.config && typeof data.config === "object" ? data.config : {};
  const devSettings = (config as Record<string, unknown>).dev_settings;
  return coerceSettings(devSettings);
}

export async function saveDevSettings(
  userId: string,
  next: DevSettings
): Promise<void> {
  const { data, error } = await supabase
    .from("player_experiments")
    .select("config")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load dev settings", error);
  }
  const existing =
    data?.config && typeof data.config === "object" ? data.config : {};
  const nextConfig = {
    ...(existing as Record<string, unknown>),
    dev_settings: { ...next },
  };
  const { error: upsertError } = await supabase.from("player_experiments").upsert(
    {
      user_id: userId,
      config: nextConfig,
    },
    { onConflict: "user_id" }
  );
  if (upsertError) {
    console.error("Failed to save dev settings", upsertError);
    throw upsertError;
  }
}
