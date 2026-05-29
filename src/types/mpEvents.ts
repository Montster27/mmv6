// Coordinated Events (MP-02) — see docs/prompts/MP-02-heatmap.md and
// docs/MULTIPLAYER-DESIGN.md. A "player" is an authenticated user
// (auth.users); MMV has no separate players table. Row shapes below mirror
// supabase/migrations/20260528130000_mp_events_mvp.sql.
//
// Prefixed `Mp` to disambiguate from the analytics `events` table /
// src/lib/events.ts and from the global DOM `Event` type.

export type MpEventStatus = "upcoming" | "active" | "resolved";

export type MpEventLocationType =
  | "dorm"
  | "dining"
  | "social"
  | "academic"
  | "admin"
  | "merchant"
  | "other";

export type MpEventLocationState =
  | "contested"
  | "leaning_pro"
  | "leaning_con"
  | "locked_pro"
  | "locked_con";

export type MpEvent = {
  id: string;
  name: string;
  description: string | null;
  sponsoring_club_id: string;
  scheduled_at: string | null;
  status: MpEventStatus;
  created_at: string;
};

export type MpEventLocation = {
  id: string;
  event_id: string;
  name: string;
  location_type: MpEventLocationType;
  state: MpEventLocationState;
  display_order: number;
};

// ─── DTOs returned by the read endpoints ─────────────────────────────

// One row of the /events index. Carries the sponsoring club's name so the
// list renders without a second round-trip.
export type MpEventListEntry = {
  id: string;
  name: string;
  description: string | null;
  status: MpEventStatus;
  scheduled_at: string | null;
  sponsoring_club_id: string;
  sponsoring_club_name: string | null;
};

// A single event with its sponsoring club name and ordered locations —
// everything the heatmap page needs in one round-trip.
export type MpEventDetail = MpEventListEntry & {
  locations: MpEventLocation[];
};
