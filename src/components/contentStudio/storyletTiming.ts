import type { Storylet } from "@/types/storylets";

/** The calendar shows every day on which a track storylet can be offered. */
export function availableOnTrackDay(storylet: Storylet, day: number): boolean {
  if (!storylet.track_id || storylet.due_offset_days == null || storylet.expires_after_days == null) return false;
  return day >= storylet.due_offset_days && day <= storylet.due_offset_days + storylet.expires_after_days;
}
