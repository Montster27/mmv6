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
    if (insertError.code === "23505") {
      return;
    }
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

  let deltaToApply = clampedDelta;
  if (clampedDelta > 0) {
    const { data: dayEvents, error: dayEventsError } = await supabase
      .from("alignment_events")
      .select("delta")
      .eq("user_id", params.userId)
      .eq("faction_key", params.factionKey)
      .eq("day_index", params.dayIndex);

    if (dayEventsError) {
      console.error("Failed to check alignment cap", dayEventsError);
      throw new Error("Failed to update alignment.");
    }

    const positiveTotal = (dayEvents ?? []).reduce((sum, event) => {
      const value = typeof event.delta === "number" ? event.delta : 0;
      return value > 0 ? sum + value : sum;
    }, 0);
    const remaining = 3 - positiveTotal;
    if (remaining <= 0) return;
    deltaToApply = Math.min(clampedDelta, remaining);
  }

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

  const nextScore = (existing?.score ?? 0) + deltaToApply;

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
    delta: deltaToApply,
    source: params.source,
    source_ref: params.sourceRef ?? null,
  });

  if (eventError) {
    console.error("Failed to record alignment event", eventError);
    throw new Error("Failed to record alignment event.");
  }
}

export async function fetchRecentAlignmentEvents(
  userId: string,
  dayIndex: number,
  limit = 5
): Promise<AlignmentEvent[]> {
  const { data, error } = await supabase
    .from("alignment_events")
    .select("id,user_id,day_index,faction_key,delta,source,source_ref,created_at")
    .eq("user_id", userId)
    .gte("day_index", Math.max(0, dayIndex - 6))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch alignment events", error);
    throw new Error("Failed to fetch alignment events.");
  }

  return data ?? [];
}

export async function hasAlignmentEvent(params: {
  userId: string;
  source: AlignmentEvent["source"];
  sourceRef: string;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from("alignment_events")
    .select("id")
    .eq("user_id", params.userId)
    .eq("source", params.source)
    .eq("source_ref", params.sourceRef)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check alignment event", error);
    throw new Error("Failed to check alignment event.");
  }

  return Boolean(data);
}
