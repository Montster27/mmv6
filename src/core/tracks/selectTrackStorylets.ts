import type {
  TrackProgress,
  TrackStoryletRow,
  Track,
  DueStorylet,
} from "@/types/tracks";

type SelectTrackStoryletsArgs = {
  dayIndex: number;
  progress: TrackProgress[];
  /**
   * Track storylets sourced from the unified storylets table.
   * Each must have track_id, storylet_key, due_offset_days, expires_after_days set.
   */
  storylets: TrackStoryletRow[];
  tracks: Track[];
  /** Maximum number of storylets to return per day. Default: 2. */
  maxStorylets?: number;
  /** Current day segment — if provided, filters by storylet.segment (null = always pass). */
  currentSegment?: string;
  /**
   * Free hours remaining today. When < CONFLICT_THRESHOLD (4h), storylets with
   * is_conflict=true bypass segment filtering and surface immediately.
   */
  hoursRemaining?: number;
};

/** Hours remaining threshold below which conflict storylets bypass segment gating. */
const CONFLICT_THRESHOLD = 4;

/**
 * Return the track storylets that are due (and not yet expired) for today.
 *
 * A storylet is due when:
 *   progress.storylet_due_day <= dayIndex <= progress.storylet_due_day + storylet.expires_after_days
 *
 * Results are sorted most-urgent first (earliest expiry day) so that
 * storylets about to expire are surfaced before fresh ones.
 */
export function selectTrackStorylets({
  dayIndex,
  progress,
  storylets,
  tracks,
  maxStorylets = 2,
  currentSegment,
  hoursRemaining,
}: SelectTrackStoryletsArgs): DueStorylet[] {
  const timeTight = typeof hoursRemaining === "number" && hoursRemaining < CONFLICT_THRESHOLD;
  const trackMap = new Map(tracks.map((t) => [t.id, t]));

  // Build a lookup keyed by "track_id:storylet_key"
  const storyletByKey = new Map(
    storylets.map((s) => [`${s.track_id}:${s.storylet_key}`, s])
  );

  const due: DueStorylet[] = [];

  for (const prog of progress) {
    if (prog.state !== "ACTIVE") continue;

    const track = trackMap.get(prog.track_id);
    if (!track || !track.is_enabled) continue;

    const storylet = storyletByKey.get(`${prog.track_id}:${prog.current_storylet_key}`);
    if (!storylet) continue;

    const dueDay = prog.storylet_due_day;
    const expiresOnDay = dueDay + storylet.expires_after_days;

    if (dayIndex < dueDay || dayIndex > expiresOnDay) continue;

    // Conflict storylets bypass segment gating when time budget is tight.
    const isConflict = Boolean(storylet.is_conflict);
    if (isConflict && timeTight) {
      // Always surface
    } else if (currentSegment && storylet.segment) {
      if (storylet.segment !== currentSegment) continue;
    }

    due.push({ progress: prog, storylet, track, expires_on_day: expiresOnDay });
  }

  // Most urgent (soonest to expire) first
  due.sort((a, b) => a.expires_on_day - b.expires_on_day);

  return due.slice(0, maxStorylets);
}

/**
 * Build the track_progress rows to insert when Chapter One begins.
 * One progress row per track, all starting at the given day.
 */
export function buildInitialTrackProgress(
  userId: string,
  tracks: Track[],
  storylets: TrackStoryletRow[],
  startedDay: number
): Array<{
  user_id: string;
  track_id: string;
  state: "ACTIVE";
  current_storylet_key: string;
  storylet_due_day: number;
  track_state: string | null;
  defer_count: number;
  started_day: number;
  updated_day: number;
}> {
  const result = [];

  for (const track of tracks) {
    // Find the first storylet (lowest order_index) for this track
    const trackStorylets = storylets
      .filter((s) => s.track_id === track.id)
      .sort((a, b) => a.order_index - b.order_index);

    if (trackStorylets.length === 0) continue;

    const first = trackStorylets[0];
    result.push({
      user_id: userId,
      track_id: track.id,
      state: "ACTIVE" as const,
      current_storylet_key: first.storylet_key,
      storylet_due_day: startedDay + first.due_offset_days,
      track_state: null,
      defer_count: 0,
      started_day: startedDay,
      updated_day: startedDay,
    });
  }

  return result;
}
