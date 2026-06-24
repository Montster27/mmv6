// Coordinated Events — Assignments (MP-03). See docs/prompts/MP-03-assign.md
// and docs/MULTIPLAYER-DESIGN.md (Coordinated Events). A "player" is an
// authenticated user (auth.users); MMV has no separate players table. Row
// shapes mirror supabase/migrations/20260528140000_mp_event_assignments.sql.
//
// Builds on the MP-02 mpEvents types: EventDetailWithPresence extends
// MpEventDetail with the presence + viewer context the heatmap page needs.

import type { MpEventDetail } from "@/types/mpEvents";

export type AssignmentSource = "coordinator" | "self_selected";

export type MpEventAssignment = {
  id: string;
  event_id: string;
  location_id: string;
  player_id: string;
  assignment_source: AssignmentSource;
  assigned_by_player_id: string | null;
  assigned_at: string;
};

// ─── Presence DTOs (folded into the event detail response) ───────────

// One present player at a location.
export type PresentPlayer = {
  player_id: string;
  display_name: string | null;
  source: AssignmentSource;
};

// Presence at a single location. Each card derives its counts from this
// list via summarizePresence().
export type LocationPresence = {
  location_id: string;
  players: PresentPlayer[];
};

// A sponsoring-club member as shown in the coordinator's side panel, with
// their current assignment for this event (null = unassigned).
export type RosterMember = {
  player_id: string;
  display_name: string | null;
  current: { location_id: string; source: AssignmentSource } | null;
};

// The viewer's own assignment for this event, if any.
export type ViewerAssignment = {
  location_id: string;
  source: AssignmentSource;
};

// Everything assignment-related the heatmap needs, folded into the detail
// response so the page makes a single fetch.
export type EventPresence = {
  coordinator_player_id: string | null;
  viewer_is_coordinator: boolean;
  viewer_assignment: ViewerAssignment | null;
  presence: LocationPresence[];
  // Populated only when the viewer is the coordinator; empty otherwise.
  roster: RosterMember[];
};

export type EventDetailWithPresence = MpEventDetail & EventPresence;
