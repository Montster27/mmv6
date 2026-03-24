import type { StreamStates, StreamId } from "@/types/chapterStreams";
import { DEFAULT_STREAM_STATES } from "@/types/chapterStreams";

/** Return a fresh copy of default stream states for Arc One day 1. */
export function initStreamStates(): StreamStates {
  return { ...DEFAULT_STREAM_STATES };
}

/**
 * Coerce an unknown value (raw JSONB from DB) into a valid StreamStates object.
 * Missing keys fall back to the default state for each stream.
 */
export function normalizeStreamStates(raw: unknown): StreamStates {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return initStreamStates();
  }
  const r = raw as Record<string, unknown>;
  return {
    roommate:
      typeof r.roommate === "string"
        ? (r.roommate as StreamStates["roommate"])
        : DEFAULT_STREAM_STATES.roommate,
    academic:
      typeof r.academic === "string"
        ? (r.academic as StreamStates["academic"])
        : DEFAULT_STREAM_STATES.academic,
    money:
      typeof r.money === "string"
        ? (r.money as StreamStates["money"])
        : DEFAULT_STREAM_STATES.money,
    belonging:
      typeof r.belonging === "string"
        ? (r.belonging as StreamStates["belonging"])
        : DEFAULT_STREAM_STATES.belonging,
    opportunity:
      typeof r.opportunity === "string"
        ? (r.opportunity as StreamStates["opportunity"])
        : DEFAULT_STREAM_STATES.opportunity,
    home:
      typeof r.home === "string"
        ? (r.home as StreamStates["home"])
        : DEFAULT_STREAM_STATES.home,
  };
}

/** Return a new StreamStates with one stream updated to the given state. */
export function setStreamState(
  states: StreamStates,
  stream: StreamId,
  state: string
): StreamStates {
  return { ...states, [stream]: state };
}
