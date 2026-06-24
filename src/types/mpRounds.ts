// Event Phase Machine (MP-05). See docs/prompts/MP-05-phase-machine.md.
// Row shapes mirror supabase/migrations/20260618000001_mp_event_phase_machine.sql.

import type { EventDetailWithPresence } from "@/types/mpAssignments";

export type MpPhase = "planning" | "active" | "resolving";

export type MpEventRound = {
  id: string;
  event_id: string;
  phase: MpPhase;
  round_number: number;
  active_started_at: string | null;
  round_duration_seconds: number;
  planning_deadline: string | null;
  ai_last_escalation_location_id: string | null;
};

export type MpTransitState = {
  id: string;
  event_id: string;
  player_id: string;
  display_name: string | null;
  from_location_id: string | null;
  to_location_id: string;
  departed_at: string;
  arrives_at: string;
};

// DTO returned by getEventPhaseState and folded into the GET detail response.
export type EventPhaseState = {
  phase: MpPhase;
  round_number: number;
  // Seconds remaining in the active round (server-computed). Null during
  // planning or resolving. Negative values mean the round has expired.
  remaining_seconds: number | null;
  // True when active and the clock has run out. Signals the board page to
  // auto-call POST .../round/resolve (lazy-expiry tick).
  is_expired: boolean;
  round_duration_seconds: number;
  active_started_at: string | null;
  ai_last_escalation_location_id: string | null;
  transit: MpTransitState[];
};

// Full response shape for GET /api/events/[id] — MP-05 extends the MP-03
// detail shape with phase state and transit.
export type EventDetailFull = EventDetailWithPresence & EventPhaseState;
