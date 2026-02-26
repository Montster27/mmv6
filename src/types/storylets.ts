export type StoryletOutcome = {
  text?: string;
  deltas?: {
    energy?: number;
    stress?: number;
    vectors?: Record<string, number>;
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
  identity_tags?: string[];
  relational_effects?: Record<string, Record<string, number>>;
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
};

export type StoryletRun = {
  id: string;
  user_id: string;
  storylet_id: string;
  day_index: number;
  choice_id?: string | null;
  created_at?: string;
};
