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

// MP-07: renamed from leaning_pro/leaning_con/locked_pro/locked_con
// to match the campaign design vocabulary.
export type MpEventLocationState =
  | "contested"
  | "leaning_yes"
  | "leaning_no"
  | "won"
  | "lost";

export type MpEventLane = "safe" | "risk";

// ─── Exposure tier (Signal 1 — personal risk) ─────────────────────────
// Tier thresholds and display values live in src/lib/mpEvents.ts.
// The type lives here alongside the other MP domain types.

export type ExposureTierKey = "unseen" | "noticed" | "watched" | "burned";

export type ExposureTier = {
  key: ExposureTierKey;
  label: string;
  max: number;   // exclusive upper bound (< max → this tier)
  glow: string;  // CSS color for the ember-dot and meter fill
  read: string;  // one-line read for the player
};

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
  // MP-07: campaign display layer
  split: number;        // 0–100, your current share of the room
  prev_split: number;   // last round's split; drift = split - prev_split (computed)
  lane: MpEventLane;
  kind: string | null;  // constituency type label ("Local merchants", etc.)
  blurb: string | null; // short description shown on the Deploy card
  map_x: number | null; // % x-position on the CSS campus map
  map_y: number | null; // % y-position on the CSS campus map
};

// MP-07: personal exposure row keyed (event_id, player_id).
// Written by the server resolver (service role); read by the game-bar meter.
export type MpEventExposure = {
  event_id: string;
  player_id: string;
  exposure: number; // 0–100
  updated_at: string;
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
