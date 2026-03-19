import type { ResourceKey } from "@/core/resources/resourceKeys";

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
  /** Jump to any storylet (same or different arc). */
  targetStoryletId?: string;
  /** Advance to the next step within the same arc (arc FSM). */
  next_step_key?: string | null;
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
  // ── FSM effects (arc-specific) ────────────────────────────────────────────
  /** Transition a named stream to a new FSM state. */
  sets_stream_state?: { stream: string; state: string };
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
  precludes?: string[];
  relational_effects?: Record<string, Record<string, number>>;
  set_npc_memory?: Record<string, Record<string, boolean>>;
  condition?: Record<string, unknown>;
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
  // ── Arc membership ────────────────────────────────────────────────────────
  /** The arc this storylet belongs to (null = standalone / ungrouped). */
  arc_id?: string | null;
  /** Unique key within the arc (used by arc_instances.current_step_key). */
  step_key?: string | null;
  /** Display order within the arc. */
  order_index?: number | null;
  /** Days after arc start this step becomes due. */
  due_offset_days?: number | null;
  /** Window (days) in which this step can be completed after it becomes due. */
  expires_after_days?: number | null;
  /** Default next step_key when no choice specifies one. */
  default_next_step_key?: string | null;
  // ── Segment / time-budget system ─────────────────────────────────────────
  /** Which day segment this beat is available in: morning | afternoon | evening | night */
  segment?: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  /** Hours deducted from daily budget when this beat is played (default 1). */
  time_cost_hours?: number | null;
};

export type StoryletRun = {
  id: string;
  user_id: string;
  storylet_id: string;
  day_index: number;
  choice_id?: string | null;
  created_at?: string;
};
