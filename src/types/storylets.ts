import type { ResourceKey } from "@/core/resources/resourceKeys";

// ── Mini-game types ──────────────────────────────────────────────────────────

export type MiniGameType = "snake" | "caps" | "memory";

export type MiniGameResult = {
  won: boolean;
  score: number;
};

/** Props contract every mini-game component must accept. */
export type MiniGameProps = {
  /** Called when the game ends. Shell routes result to outcome resolution. */
  onComplete: (result: MiniGameResult) => void;
  /** Adaptive difficulty 0–1. Higher = harder. */
  difficulty: number;
  /** Optional per-instance config overrides from the storylet. */
  config?: Record<string, unknown>;
};

export type StoryletOutcome = {
  text?: string;
  deltas?: {
    energy?: number;
    stress?: number;
    vectors?: Record<string, number>;
    /** Resource grants (positive) or costs (negative) applied when this outcome fires. */
    resources?: Partial<Record<ResourceKey, number>>;
  };
  anomalies?: string[];
};

export type StoryletOutcomeOption = StoryletOutcome & {
  id: string;
  weight: number;
  modifiers?: {
    vector?: string;
    per10?: number;
  };
};

export type StoryletChoice = {
  id: string;
  label: string;
  // ── Deterministic outcome ─────────────────────────────────────────────────
  outcome?: StoryletOutcome;
  // ── Probabilistic outcomes ────────────────────────────────────────────────
  outcomes?: StoryletOutcomeOption[];
  check?: import("./checks").Check;
  // ── Navigation ────────────────────────────────────────────────────────────
  /** Jump to any storylet (same or different track). */
  targetStoryletId?: string;
  /** Advance to the next storylet within the same track. */
  next_key?: string | null;
  // ── Costs ─────────────────────────────────────────────────────────────────
  time_cost?: number;
  energy_cost?: number;
  /** Structured resource costs/rewards (arc-style, complementary to outcome.deltas). */
  costs?: {
    resources?: Partial<Record<ResourceKey, number>>;
    skill_points?: number;
    dispositions?: Record<string, number>;
  };
  rewards?: {
    resources?: Partial<Record<ResourceKey, number>>;
    skill_points?: number;
    dispositions?: Record<string, number>;
  };
  /** Gate: player must hold this resource at or above min to see choice. */
  requires_resource?: {
    key: ResourceKey;
    min: number;
  };
  /** Cost: deducted from this resource when choice is selected. */
  costs_resource?: {
    key: ResourceKey;
    amount: number;
  };
  // ── FSM effects (track-specific) ──────────────────────────────────────────
  /** Set the track's narrative state on track_progress. */
  sets_track_state?: { state: string };
  /** Mark a named opportunity type as expired. */
  sets_expired_opportunity?: "academic" | "social" | "financial";
  /** Shift the player's money band. */
  money_effect?: "improve" | "worsen";
  money_requirement?: "tight" | "okay" | "comfortable";
  outcome_type?: "success" | "fail" | "neutral";
  // ── Narrative / social ────────────────────────────────────────────────────
  reaction_text?: string | null;
  reaction_text_conditions?: Array<{
    if: Record<string, unknown>;
    text: string;
    relational_effects?: Record<string, Record<string, number>>;
    set_npc_memory?: Record<string, Record<string, boolean>>;
  }>;
  events_emitted?: Array<{
    npc_id: string;
    type: string;
    magnitude?: number;
  }>;
  identity_tags?: string[];
  skill_modifier?: string;
  skill_requirement?: string;
  /** Skill web: grow skills when this choice is taken. */
  skill_growth?: Array<{ skill: string; increment: number }>;
  /** Skill web: require minimum skill levels to show/enable this choice. */
  skill_web_requirements?: Array<{ skill: string; min_level: number }>;
  precludes?: string[];
  relational_effects?: Record<string, Record<string, number>>;
  set_npc_memory?: Record<string, Record<string, boolean>>;
  condition?: Record<string, unknown>;
  // ── Mini-game trigger ──────────────────────────────────────────────────────
  /**
   * When present, selecting this choice launches a mini-game before resolving
   * the outcome. The game result (won/lost) determines which outcome fires.
   * Use with `outcomes` array containing `id: "success"` and `id: "failure"`.
   */
  mini_game?: {
    /** Which game to launch: "snake" | "caps" | "memory" */
    type: MiniGameType;
    /** Optional per-instance overrides (e.g. custom win threshold). */
    config?: Record<string, unknown>;
  };
};

export type Storylet = {
  id: string;
  slug: string;
  title: string;
  body: string;
  choices: StoryletChoice[];
  is_active: boolean;
  created_at?: string;
  tags?: string[];
  requirements?: Record<string, unknown>;
  weight?: number;
  /**
   * NPC ids this storylet can introduce. On first encounter (NPC not yet met),
   * a brief intro blurb is prepended to the body. All listed NPCs are
   * auto-marked met after any choice is taken. No requires_npc_met gate needed.
   */
  introduces_npc?: string[];
  // ── Track membership ──────────────────────────────────────────────────────
  /** The track this storylet belongs to (null = standalone). */
  track_id?: string | null;
  /** Unique key within the track (used by track_progress.current_storylet_key). */
  storylet_key?: string | null;
  /** Display order within the track. */
  order_index?: number | null;
  /** Days after track start this storylet becomes due. */
  due_offset_days?: number | null;
  /** Window (days) in which this storylet can be completed after due day. */
  expires_after_days?: number | null;
  /** Default next storylet_key when no choice specifies one. */
  default_next_key?: string | null;
  // ── Segment / time-budget system ─────────────────────────────────────────
  /** Which day segment this storylet is available in. */
  segment?: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  /** Hours deducted from daily budget (default 1). */
  time_cost_hours?: number | null;
  /** When true, surfaces as a conflict event when time budget is tight. */
  is_conflict?: boolean;
};

export type StoryletRun = {
  id: string;
  user_id: string;
  storylet_id: string;
  day_index: number;
  choice_id?: string | null;
  created_at?: string;
};
