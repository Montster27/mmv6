export type FactionKey =
  | "neo_assyrian"
  | "dynastic_consortium"
  | "templar_remnant"
  | "bormann_network";

export type Faction = {
  key: FactionKey;
  name: string;
  ideology: string;
  aesthetic: string;
  created_at: string;
};

export type UserAlignment = {
  user_id: string;
  faction_key: FactionKey;
  score: number;
  updated_at: string;
};

export type FactionDirective = {
  id: string;
  cohort_id: string;
  faction_key: FactionKey;
  week_start_day_index: number;
  week_end_day_index: number;
  title: string;
  description: string;
  target_type: "initiative" | "arc_unlock" | "signal";
  target_key: string | null;
  status: "active" | "expired" | "completed";
  created_at: string;
};

export type AlignmentEvent = {
  id: string;
  user_id: string;
  day_index: number;
  faction_key: FactionKey;
  delta: number;
  source: "arc_choice" | "initiative" | "directive";
  source_ref: string | null;
  created_at: string;
};
