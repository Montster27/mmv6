/**
 * Arc One — Six Opening Stream Types
 *
 * Each of the six simultaneous narrative streams has its own FSM with 5 states.
 * These states are stored in daily_states.stream_states (JSONB).
 */

/** Identifies one of the six Arc One narrative streams. */
export type StreamId =
  | "roommate"
  | "academic"
  | "money"
  | "belonging"
  | "opportunity"
  | "home";

// ---------------------------------------------------------------------------
// Stream 1: The Roommate
// ---------------------------------------------------------------------------
export type RoommateState =
  | "neutral_coexistence"
  | "genuine_connection"
  | "surface_tension"
  | "open_conflict"
  | "avoidance_pattern"
  | "neutral_start"
  | "avoidance_start";

// ---------------------------------------------------------------------------
// Stream 2: Academic Footing
// ---------------------------------------------------------------------------
export type AcademicState =
  | "false_confidence"
  | "quiet_doubt"
  | "active_engagement"
  | "avoidance_spiral"
  | "found_a_thread";

// ---------------------------------------------------------------------------
// Stream 3: Money Reality
// ---------------------------------------------------------------------------
export type MoneyStreamState =
  | "not_yet_felt"
  | "background_hum"
  | "friction_visible"
  | "active_stress"
  | "resolved"
  | "tight"
  | "okay"
  | "comfortable";

// ---------------------------------------------------------------------------
// Stream 4: Finding Your People
// ---------------------------------------------------------------------------
export type BelongingState =
  | "open_scanning"
  | "first_anchor"
  | "performing_fit"
  | "genuine_match"
  | "withdrawal";

// ---------------------------------------------------------------------------
// Stream 5: First Opportunity With a Cost
// ---------------------------------------------------------------------------
export type OpportunityState =
  | "undiscovered"
  | "discovered"
  | "noticed"
  | "considering"
  | "deferred"
  | "pursuing"
  | "committed"
  | "expired";

// ---------------------------------------------------------------------------
// Stream 6: Something From Home
// ---------------------------------------------------------------------------
export type HomeState =
  | "clean_break"
  | "background_warmth"
  | "guilt_current"
  | "active_pull"
  | "identity_rupture";

// ---------------------------------------------------------------------------
// Combined type stored in daily_states.stream_states
// ---------------------------------------------------------------------------
export type StreamStates = {
  roommate: RoommateState;
  academic: AcademicState;
  money: MoneyStreamState;
  belonging: BelongingState;
  opportunity: OpportunityState;
  home: HomeState;
};

/** Starting state for every stream at the beginning of Arc One. */
export const DEFAULT_STREAM_STATES: StreamStates = {
  roommate: "neutral_coexistence",
  academic: "false_confidence",
  money: "not_yet_felt",
  belonging: "open_scanning",
  opportunity: "undiscovered",
  home: "background_warmth",
};

/** Maps each arc_key to its StreamId for display/routing. */
export const ARC_KEY_TO_STREAM_ID: Record<string, StreamId> = {
  arc_roommate: "roommate",
  arc_academic: "academic",
  arc_money: "money",
  arc_belonging: "belonging",
  arc_people: "belonging",
  arc_opportunity: "opportunity",
  arc_home: "home",
};

/**
 * Content JSON may reference streams by alternative names.
 * This maps those aliases to the canonical StreamId.
 */
export const STREAM_ALIASES: Record<string, StreamId> = {
  people: "belonging",
};

/** Human-readable label for each stream. */
export const STREAM_LABELS: Record<StreamId, string> = {
  roommate: "The Roommate",
  academic: "Academic Footing",
  money: "Money Reality",
  belonging: "Finding Your People",
  opportunity: "First Opportunity",
  home: "Something From Home",
};

/** The six arc keys that belong to Arc One. */
export const ARC_ONE_STREAM_KEYS: string[] = [
  "arc_roommate",
  "arc_academic",
  "arc_money",
  "arc_belonging",
  "arc_people",
  "arc_opportunity",
  "arc_home",
];
