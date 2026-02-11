export type RemnantKey =
  | "memory_fragment"
  | "relationship_echo"
  | "composure_scar"
  | "anomaly_thread";

export type RemnantDefinition = {
  key: RemnantKey;
  name: string;
  description: string;
  effect: string;
};

export type RemnantUnlock = {
  user_id: string;
  remnant_key: RemnantKey;
  discovered_at: string;
};

export type RemnantSelection = {
  user_id: string;
  remnant_key: RemnantKey;
  selected_at: string;
  active: boolean;
  last_applied_day_index: number | null;
};
