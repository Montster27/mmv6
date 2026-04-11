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
  /**
   * Map of track_id → Set of option_key strings the player has picked on that track.
   * Sourced from choice_log. Used to evaluate requires_choice requirements.
   * Track-scoped: a choice on one track cannot gate a storylet on a different track.
   */
  resolvedChoicesByTrack?: Map<string, Set<string>>;
  /**
   * Set of skill_id strings the player has trained (status='trained').
   * Used to evaluate requires_skill on storylet-level requirements (pool gating).
   * Phase 2: binary check only (trained or not); min_level ignored.
   */
  trainedSkillIds?: Set<string>;
};

/** Hours remaining threshold below which conflict storylets bypass segment gating. */
const CONFLICT_THRESHOLD = 4;

/**
 * Evaluate a storylet's requirements against the player's resolved choices on
 * the same track and trained skills.
 *
 * Supported requirement types:
 *   requires_choice: string  — the player must have previously picked a choice
 *     with that option_key on this track.
 *   requires_skill: { skill_id: string; min_level?: number }  — the player must
 *     have trained this skill. Phase 2: binary only (min_level ignored).
 *
 * Unknown requirement keys pass (forward-compatible).
 *
 * NOTE: requires_choice is track-scoped. requires_skill is global (skills are not
 * track-scoped). Cross-track choice gating is a future extension.
 */
function meetsRequirements(
  storylet: TrackStoryletRow,
  resolvedChoices: Set<string>,
  trainedSkillIds: Set<string> = new Set()
): boolean {
  const reqs = storylet.requirements as Record<string, unknown> | null | undefined;
  if (!reqs || typeof reqs !== "object" || Object.keys(reqs).length === 0) return true;

  if (typeof reqs.requires_choice === "string") {
    if (!resolvedChoices.has(reqs.requires_choice)) return false;
  }

  // Phase 2: storylet-level skill gating (pool gating)
  if (reqs.requires_skill && typeof reqs.requires_skill === "object") {
    const skillReq = reqs.requires_skill as { skill_id?: string; min_level?: number };
    if (typeof skillReq.skill_id === "string") {
      if (!trainedSkillIds.has(skillReq.skill_id)) return false;
    }
  }

  return true;
}

/**
 * Check whether a storylet passes the segment filter.
 * Conflict storylets bypass gating when time is tight.
 */
function passesSegmentFilter(
  storylet: TrackStoryletRow,
  currentSegment: string | undefined,
  timeTight: boolean
): boolean {
  if (Boolean(storylet.is_conflict) && timeTight) return true;
  if (currentSegment && storylet.segment) {
    return storylet.segment === currentSegment;
  }
  return true;
}

/**
 * Return the track storylets that are due (and not yet expired/resolved) for today.
 *
 * Pool-based selection:
 *   For each ACTIVE track, if next_key_override is set, serve that storylet first
 *   (bypassing the pool scan). Otherwise, scan all storylets on the track and return
 *   the most urgent eligible one (earliest expiry).
 *
 * A storylet is eligible when:
 *   - NOT in progress.resolved_storylet_keys
 *   - is_active = true
 *   - started_day + due_offset_days <= dayIndex <= that + expires_after_days
 *   - segment matches (or is null, or storylet is_conflict with time tight)
 *   - requirements are met
 *
 * Results are sorted most-urgent first (earliest expiry day) so that
 * storylets about to expire are surfaced before fresh ones.
 * At most one storylet per track is returned (the most urgent).
 * Global cap: maxStorylets (default 2).
 */
export function selectTrackStorylets({
  dayIndex,
  progress,
  storylets,
  tracks,
  maxStorylets = 2,
  currentSegment,
  hoursRemaining,
  resolvedChoicesByTrack = new Map(),
  trainedSkillIds = new Set(),
}: SelectTrackStoryletsArgs): DueStorylet[] {
  const timeTight = typeof hoursRemaining === "number" && hoursRemaining < CONFLICT_THRESHOLD;
  const trackMap = new Map(tracks.map((t) => [t.id, t]));

  // Pre-index storylets by track_id for efficient pool scans
  const storyletsByTrack = new Map<string, TrackStoryletRow[]>();
  for (const s of storylets) {
    const arr = storyletsByTrack.get(s.track_id) ?? [];
    arr.push(s);
    storyletsByTrack.set(s.track_id, arr);
  }

  const due: DueStorylet[] = [];

  for (const prog of progress) {
    if (prog.state !== "ACTIVE") continue;

    const track = trackMap.get(prog.track_id);
    if (!track || !track.is_enabled) continue;

    const resolvedKeys = new Set(prog.resolved_storylet_keys);
    const resolvedChoices = resolvedChoicesByTrack.get(prog.track_id) ?? new Set<string>();
    const trackStorylets = storyletsByTrack.get(prog.track_id) ?? [];

    // -------------------------------------------------------------------------
    // Priority override: if next_key_override is set, serve that storylet next.
    // This preserves explicit chains (next_key on a choice / default_next_key).
    // -------------------------------------------------------------------------
    if (prog.next_key_override) {
      // Safety: if the override points to an already-resolved storylet, clear
      // it and fall through to the pool scan instead of re-serving it.
      if (resolvedKeys.has(prog.next_key_override)) {
        // Fall through to pool scan — override is stale
      } else {
        const overrideStorylet = trackStorylets.find(
          (s) => s.storylet_key === prog.next_key_override
        );

        if (overrideStorylet) {
          const dueDay = prog.started_day + overrideStorylet.due_offset_days;
          const expiresOnDay = dueDay + overrideStorylet.expires_after_days;

          if (dayIndex < dueDay) {
            // Override is set but not yet due — wait; don't fall through to pool
            continue;
          }

          if (dayIndex <= expiresOnDay) {
            // Override is due and not expired — apply segment filter
            if (passesSegmentFilter(overrideStorylet, currentSegment, timeTight)) {
              due.push({ progress: prog, storylet: overrideStorylet, track, expires_on_day: expiresOnDay });
            }
            // Whether it passes segment or not, don't also scan pool for this track
            continue;
          }

          // Override expired — fall through to pool scan
        }
        // Override storylet not found — fall through to pool scan
      }
    }

    // -------------------------------------------------------------------------
    // Pool scan: find the most urgent eligible storylet on this track.
    // -------------------------------------------------------------------------
    let bestCandidate: DueStorylet | null = null;

    for (const storylet of trackStorylets) {
      // Skip already resolved
      if (resolvedKeys.has(storylet.storylet_key)) continue;
      // Skip inactive
      if (!storylet.is_active) continue;

      const dueDay = prog.started_day + storylet.due_offset_days;
      const expiresOnDay = dueDay + storylet.expires_after_days;

      if (dayIndex < dueDay) continue;
      if (dayIndex > expiresOnDay) continue;

      if (!meetsRequirements(storylet, resolvedChoices, trainedSkillIds)) continue;
      if (!passesSegmentFilter(storylet, currentSegment, timeTight)) continue;

      const candidate: DueStorylet = { progress: prog, storylet, track, expires_on_day: expiresOnDay };
      if (!bestCandidate || expiresOnDay < bestCandidate.expires_on_day) {
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      due.push(bestCandidate);
    }
  }

  // Most urgent (soonest to expire) first across all tracks
  due.sort((a, b) => a.expires_on_day - b.expires_on_day);

  return due.slice(0, maxStorylets);
}

/**
 * Build the track_progress rows to insert when Chapter One begins.
 * One progress row per track, all starting at the given day.
 * Sets next_key_override to the first storylet so it's served via the override
 * path on first load (identical behaviour to the old chain-based system).
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
  resolved_storylet_keys: string[];
  next_key_override: string;
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
      resolved_storylet_keys: [],
      next_key_override: first.storylet_key,
    });
  }

  return result;
}
