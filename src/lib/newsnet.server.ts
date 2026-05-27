import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseAttributionHandle } from "./newsnet";

// ─────────────────────────────────────────────────────────────────────
// NewsNet — server-only helpers (Supabase reads, auth verification)
//
// Pure helpers (cursor, merge, types) live in `newsnet.ts` and are safe
// to import from anywhere. This module is the server-side companion.
// ─────────────────────────────────────────────────────────────────────

// ─── Reserved-handle list ────────────────────────────────────────────

/**
 * Returns a Set of lowercased reserved handles, derived from existing NPC
 * attributions on `harvest_items` rows where `type='usenet'`. The reservation
 * list prevents players from impersonating known NPC voices.
 *
 * Computed at request time (14 rows — cheap). If the NPC roster grows
 * substantially, swap to a per-instance cache.
 */
export async function getReservedHandles(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client
    .from("harvest_items")
    .select("attribution")
    .eq("type", "usenet")
    .not("attribution", "is", null);

  if (error) {
    console.error("[newsnet] failed to load reserved handles", error);
    throw new Error("Failed to load reserved handles");
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const attr = (row as { attribution: string | null }).attribution;
    if (attr) set.add(parseAttributionHandle(attr));
  }
  return set;
}

// ─── Current-day reader ──────────────────────────────────────────────

/**
 * Returns the player's current in-game day_index, read from `daily_states`
 * (the canonical per-user "current day" pointer). Returns null if the user
 * has no daily_states row yet (i.e. hasn't started their game).
 */
export async function getCurrentDayIndex(
  client: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data, error } = await client
    .from("daily_states")
    .select("day_index")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[newsnet] failed to load daily_states for current day", error);
    throw new Error("Failed to load current day");
  }

  if (!data) return null;
  return (data as { day_index: number }).day_index;
}

// ─── Player arc flags reader ─────────────────────────────────────────

export async function getPlayerArcFlags(
  client: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await client
    .from("player_arc_flags")
    .select("flag_name")
    .eq("player_id", userId);

  if (error) {
    console.error("[newsnet] failed to load player_arc_flags", error);
    throw new Error("Failed to load player flags");
  }

  return new Set((data ?? []).map((row) => (row as { flag_name: string }).flag_name));
}

// ─── Auth helper ─────────────────────────────────────────────────────

export async function getUserFromAuthHeader(
  client: SupabaseClient,
  authHeader: string | null
): Promise<{ id: string } | null> {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    if (error) console.error("[newsnet] token verification failed", error);
    return null;
  }
  return { id: data.user.id };
}
