export const REQUIRED_TELEMETRY_EVENTS = [
  "session_start",
  "first_choice_time",
  "storylet_complete",
  "community_post_created",
  "community_reply_sent",
  "buddy_nudge_used",
  "compare_view_opened",
  "remnant_earned",
  "remnant_selected",
  "next_run_started",
  "dropoff_point",
  "session_end",
] as const;

export type RequiredTelemetryEvent = (typeof REQUIRED_TELEMETRY_EVENTS)[number];

export type TelemetryEvent = {
  event_type: string;
  day_index?: number;
  stage?: string | null;
  payload?: Record<string, unknown>;
  ts?: string;
};
