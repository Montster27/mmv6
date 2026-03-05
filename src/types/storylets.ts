export type StoryletOutcome = {
  text?: string;
  deltas?: {
    energy?: number;
    stress?: number;
    vectors?: Record<string, number>;
    /** Resource grants (positive) or costs (negative) applied when this outcome fires. */
    resources?: Partial<Record<import("../core/resources/resourceKeys").ResourceKey, number>>;
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
  outcome?: StoryletOutcome;
  outcomes?: StoryletOutcomeOption[];
  check?: import("./checks").Check;
  targetStoryletId?: string;
  time_cost?: number;
  energy_cost?: number;
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
  precludes?: string[];
  relational_effects?: Record<string, Record<string, number>>;
  set_npc_memory?: Record<string, Record<string, boolean>>;
  condition?: Record<string, unknown>;
  /** Gate: this choice is only selectable when the named resource meets the minimum. */
  requires_resource?: {
    key: import("../core/resources/resourceKeys").ResourceKey;
    min: number;
  };
  /** Cost: this amount is deducted from the resource when the choice is selected. */
  costs_resource?: {
    key: import("../core/resources/resourceKeys").ResourceKey;
    amount: number;
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
};

export type StoryletRun = {
  id: string;
  user_id: string;
  storylet_id: string;
  day_index: number;
  choice_id?: string | null;
  created_at?: string;
};
