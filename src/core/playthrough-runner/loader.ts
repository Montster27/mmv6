/**
 * Playthrough Runner — Content Loader
 *
 * Loads the immutable release pinned to the test player, exactly as the game does.
 */

import { db } from "./client";
import type { Track, TrackStoryletRow } from "@/types/tracks";


export async function loadTracks(userId: string): Promise<Track[]> {
  const { data, error } = await db
    .rpc("runtime_tracks", { p_user_id: userId })
    .select("id,key,title,description,category,chapter,is_enabled,tags")
    .eq("is_enabled", true);
  if (error) throw new Error(`Failed to load tracks: ${error.message}`);
  return (data ?? []) as Track[];
}

export async function loadStorylets(userId: string): Promise<TrackStoryletRow[]> {
  const { data, error } = await db
    .rpc("runtime_storylets", { p_user_id: userId })
    .select(
      "id,slug,title,body,choices,tags,is_active,track_id,storylet_key,order_index," +
        "due_offset_days,expires_after_days,default_next_key,segment,time_cost_hours," +
        "weight,requirements,introduces_npc,is_conflict,nodes,created_at"
    );
  if (error) throw new Error(`Failed to load storylets: ${error.message}`);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map((row) => ({
    ...row,
    choices: Array.isArray(row.choices) ? row.choices : [],
    due_offset_days: (row.due_offset_days as number | null) ?? 0,
    expires_after_days: (row.expires_after_days as number | null) ?? 2,
    order_index: (row.order_index as number | null) ?? 0,
    track_id: (row.track_id as string | null) ?? "",
    storylet_key: (row.storylet_key as string | null) ?? (row.slug as string),
  })) as TrackStoryletRow[];
}

export async function loadChoiceLog(
  userId: string
): Promise<Map<string, Set<string>>> {
  const { data, error } = await db
    .from("choice_log")
    .select("track_id,option_key")
    .eq("user_id", userId)
    .eq("event_type", "STORYLET_RESOLVED");
  if (error) throw new Error(`Failed to load choice_log: ${error.message}`);

  const map = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!row.track_id || !row.option_key) continue;
    const set = map.get(row.track_id) ?? new Set<string>();
    set.add(row.option_key);
    map.set(row.track_id, set);
  }
  return map;
}

export async function loadFlagLog(
  userId: string
): Promise<{ flagsByTrack: Map<string, Set<string>>; globalFlags: Set<string> }> {
  const { data, error } = await db
    .from("choice_log")
    .select("track_id,option_key")
    .eq("user_id", userId)
    .eq("event_type", "FLAG_SET");
  if (error) throw new Error(`Failed to load flag_log: ${error.message}`);

  const flagsByTrack = new Map<string, Set<string>>();
  const globalFlags = new Set<string>();
  for (const row of data ?? []) {
    if (!row.option_key) continue;
    globalFlags.add(row.option_key);
    if (row.track_id) {
      const set = flagsByTrack.get(row.track_id) ?? new Set<string>();
      set.add(row.option_key);
      flagsByTrack.set(row.track_id, set);
    }
  }
  return { flagsByTrack, globalFlags };
}

export function clearCache(): void {
  // Content is no longer cached across player releases.
}
