/**
 * Playthrough Runner — Content Loader
 *
 * Reads storylets/tracks directly from Supabase (same source of truth as dev server).
 * No fixture copies of storylet content. Caches per session.
 */

import { db } from "./client";
import type { Track, TrackStoryletRow } from "@/types/tracks";

let cachedTracks: Track[] | null = null;
let cachedStorylets: TrackStoryletRow[] | null = null;

export async function loadTracks(): Promise<Track[]> {
  if (cachedTracks) return cachedTracks;
  const { data, error } = await db
    .from("tracks")
    .select("id,key,title,description,category,chapter,is_enabled,tags")
    .eq("is_enabled", true);
  if (error) throw new Error(`Failed to load tracks: ${error.message}`);
  cachedTracks = (data ?? []) as Track[];
  return cachedTracks;
}

export async function loadStorylets(): Promise<TrackStoryletRow[]> {
  if (cachedStorylets) return cachedStorylets;
  const { data, error } = await db
    .from("storylets")
    .select(
      "id,slug,title,body,choices,tags,is_active,track_id,storylet_key,order_index," +
        "due_offset_days,expires_after_days,default_next_key,segment,time_cost_hours," +
        "weight,requirements,introduces_npc,is_conflict,nodes,created_at"
    );
  if (error) throw new Error(`Failed to load storylets: ${error.message}`);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  cachedStorylets = rows.map((row) => ({
    ...row,
    choices: Array.isArray(row.choices) ? row.choices : [],
    due_offset_days: (row.due_offset_days as number | null) ?? 0,
    expires_after_days: (row.expires_after_days as number | null) ?? 2,
    order_index: (row.order_index as number | null) ?? 0,
    track_id: (row.track_id as string | null) ?? "",
    storylet_key: (row.storylet_key as string | null) ?? (row.slug as string),
  })) as TrackStoryletRow[];
  return cachedStorylets;
}

export async function loadChoiceLog(
  userId: string
): Promise<Map<string, Set<string>>> {
  const { data, error } = await db
    .from("choice_log")
    .select("track_id,option_key")
    .eq("user_id", userId);
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

export function clearCache(): void {
  cachedTracks = null;
  cachedStorylets = null;
}
