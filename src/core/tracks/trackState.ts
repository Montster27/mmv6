import { DEFAULT_TRACK_STATES, type TrackKey } from "@/types/tracks";

/**
 * Return the default track state for a given track key.
 * Returns null if the track key is not recognized.
 */
export function getDefaultTrackState(trackKey: string): string | null {
  return DEFAULT_TRACK_STATES[trackKey as TrackKey] ?? null;
}
