import { supabase } from "@/lib/supabase/browser";
import { FACTION_KEYS } from "@/lib/factions";
import type { AlignmentEvent, FactionKey, UserAlignment } from "@/types/factions";

export const ARC_CHOICE_ALIGNMENT_DELTAS: Record<
  string,
  { factionKey: FactionKey; delta: number }
> = {
  log_it: { factionKey: "dynastic_consortium", delta: 2 },
  go: { factionKey: "templar_remnant", delta: 2 },
  test: { factionKey: "neo_assyrian", delta: 2 },
  burn: { factionKey: "bormann_network", delta: 2 },
};

export async function ensureUserAlignmentRows(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_alignment")
    .select("faction_key")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch alignment rows", error);
    throw new Error("Failed to load alignment.");
  }

  const existing = new Set((data ?? []).map((row) => row.faction_key));
  const missing = FACTION_KEYS.filter((key) => !existing.has(key));

  if (missing.length === 0) return;

  const insertPayload = missing.map((key) => ({
    user_id: userId,
    faction_key: key,
    score: 0,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("user_alignment")
    .insert(insertPayload);

  if (insertError) {
    console.error("Failed to initialize alignment", insertError);
    throw new Error("Failed to initialize alignment.");
  }
}

export async function fetchUserAlignment(userId: string): Promise<UserAlignment[]> {
  const { data, error } = await supabase
    .from("user_alignment")
    .select("user_id,faction_key,score,updated_at")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch alignment", error);
    throw new Error("Failed to fetch alignment.");
  }

  return data ?? [];
}

export async function applyAlignmentDelta(params: {
  userId: string;
  dayIndex: number;
  factionKey: FactionKey;
  delta: number;
  source: AlignmentEvent["source"];
  sourceRef?: string | null;
}): Promise<void> {
  const clampedDelta = Math.max(-3, Math.min(3, params.delta));
  if (clampedDelta === 0) return;

  await ensureUserAlignmentRows(params.userId);

  const { data: existing, error: existingError } = await supabase
    .from("user_alignment")
    .select("score")
    .eq("user_id", params.userId)
    .eq("faction_key", params.factionKey)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to load alignment row", existingError);
    throw new Error("Failed to update alignment.");
  }

  const nextScore = (existing?.score ?? 0) + clampedDelta;

  const { data: updated, error: updateError } = await supabase
    .from("user_alignment")
    .update({
      score: nextScore,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId)
    .eq("faction_key", params.factionKey)
    .select("score")
    .limit(1)
    .maybeSingle();

  if (updateError) {
    console.error("Failed to update alignment", updateError);
    throw new Error("Failed to update alignment.");
  }

  if (!updated) {
    throw new Error("Failed to update alignment.");
  }

  const { error: eventError } = await supabase.from("alignment_events").insert({
    user_id: params.userId,
    day_index: params.dayIndex,
    faction_key: params.factionKey,
    delta: clampedDelta,
    source: params.source,
    source_ref: params.sourceRef ?? null,
  });

  if (eventError) {
    console.error("Failed to record alignment event", eventError);
    throw new Error("Failed to record alignment event.");
  }
}
