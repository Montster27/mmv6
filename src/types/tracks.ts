/**
 * Track + Storylet Content Model — Type Definitions
 *
 * A Track is a named parallel narrative thread containing a DAG of storylets.
 * Multiple tracks run concurrently (e.g., roommate, academic, money).
 *
 * See docs/TRACK_AND_STORYLET_MODEL.md for the full spec.
 */

import type { StoryletChoice } from "./storylets";

// ---------------------------------------------------------------------------
// Track keys
// ---------------------------------------------------------------------------

/** Identifies one of the Chapter One narrative tracks. */
export type TrackKey =
  | "roommate"
  | "academic"
  | "money"
  | "belonging"
  | "opportunity"
  | "home";

/** The track keys that belong to Chapter One. */
export const CHAPTER_ONE_TRACK_KEYS: TrackKey[] = [
  "roommate",
  "academic",
  "money",
  "belonging",
  "opportunity",
  "home",
];

/** Human-readable label for each track. */
export const TRACK_LABELS: Record<TrackKey, string> = {
  roommate: "The Roommate",
  academic: "Academic Footing",
  money: "Money Reality",
  belonging: "Finding Your People",
  opportunity: "First Opportunity",
  home: "Something From Home",
};

// ---------------------------------------------------------------------------
// Track state types (narrative FSM states per track)
// ---------------------------------------------------------------------------

export type RoommateState =
  | "neutral_coexistence"
  | "genuine_connection"
  | "surface_tension"
  | "open_conflict"
  | "avoidance_pattern";

export type AcademicState =
  | "false_confidence"
  | "quiet_doubt"
  | "active_engagement"
  | "avoidance_spiral"
  | "found_a_thread";

export type MoneyState =
  | "not_yet_felt"
  | "background_hum"
  | "friction_visible"
  | "active_stress"
  | "resolved";

export type BelongingState =
  | "open_scanning"
  | "first_anchor"
  | "performing_fit"
  | "genuine_match"
  | "withdrawal";

export type OpportunityState =
  | "undiscovered"
  | "noticed"
  | "considering"
  | "pursuing"
  | "committed"
  | "expired";

export type HomeState =
  | "clean_break"
  | "background_warmth"
  | "guilt_current"
  | "active_pull"
  | "identity_rupture";

/** Default starting track state for Chapter One. */
export const DEFAULT_TRACK_STATES: Record<TrackKey, string> = {
  roommate: "neutral_coexistence",
  academic: "false_confidence",
  money: "not_yet_felt",
  belonging: "open_scanning",
  opportunity: "undiscovered",
  home: "background_warmth",
};

// ---------------------------------------------------------------------------
// Track definition (DB row from `tracks` table)
// ---------------------------------------------------------------------------

export type Track = {
  id: string;
  key: string;
  title: string;
  description: string;
  category: string;
  chapter: string;
  is_enabled: boolean;
  tags: string[];
};

// ---------------------------------------------------------------------------
// Track progress (DB row from `track_progress` table)
// ---------------------------------------------------------------------------

export type TrackProgressState = "ACTIVE" | "COMPLETED" | "FAILED" | "ABANDONED";

export type TrackProgress = {
  id: string;
  user_id: string;
  track_id: string;
  state: TrackProgressState;
  current_storylet_key: string;
  storylet_due_day: number;
  track_state: string | null;
  started_day: number;
  defer_count: number;
  updated_day: number;
  completed_day?: number | null;
  failure_reason?: string | null;
  branch_key?: string | null;
  /** Keys of storylets the user has already resolved on this track. */
  resolved_storylet_keys: string[];
  /**
   * When set, serve this storylet next (bypasses pool scan for one turn).
   * Used to preserve next_key chains within the pool-based engine.
   */
  next_key_override: string | null;
};

// ---------------------------------------------------------------------------
// Track storylet — a Storylet with required track membership fields
// ---------------------------------------------------------------------------

import type { DialogueNode, Storylet } from "./storylets";

export type TrackStoryletRow = Storylet & {
  track_id: string;
  storylet_key: string;
  order_index: number;
  due_offset_days: number;
  expires_after_days: number;
};

// ---------------------------------------------------------------------------
// Due storylet — pipeline type for selection algorithm
// ---------------------------------------------------------------------------

export type DueStorylet = {
  progress: TrackProgress;
  storylet: TrackStoryletRow;
  track: Track;
  expires_on_day: number;
};

// ---------------------------------------------------------------------------
// TrackStorylet — display type (what the player sees)
// ---------------------------------------------------------------------------

export type TrackStorylet = {
  progress_id: string;
  track_key: string;
  title: string;
  body: string;
  options: StoryletChoice[];
  /** Conversational node tree. When present, renders as interactive dialogue. */
  nodes?: DialogueNode[] | null;
  expires_on_day: number;
  introduces_npc?: string[];
  segment?: "morning" | "afternoon" | "evening" | "night" | null;
  is_conflict?: boolean;
};

// ---------------------------------------------------------------------------
// Log event types
// ---------------------------------------------------------------------------

export type LogEventType =
  | "OFFER_SHOWN"
  | "TRACK_STARTED"
  | "STORYLET_DEFERRED"
  | "STORYLET_RESOLVED"
  | "STORYLET_EXPIRED"
  | "TRACK_ABANDONED"
  | "TRACK_FAILED"
  | "TRACK_COMPLETED"
  | "OFFER_EXPIRED";
