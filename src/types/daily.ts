import type { JsonObject, SevenVectors } from "./vectors";

export type DailyState = {
  id: string;
  user_id: string;
  day_index: number;
  energy: number;
  stress: number;
  vectors: SevenVectors | JsonObject;
  life_pressure_state?: JsonObject;
  energy_level?: "high" | "moderate" | "low";
  money_band?: "tight" | "okay" | "comfortable";
  skill_flags?: JsonObject;
  npc_memory?: JsonObject;
  expired_opportunities?: JsonObject;
  replay_intention?: JsonObject;
  arc_one_reflection_done?: boolean;
  start_date?: string;
  last_day_completed?: string | null;
  last_day_index_completed?: number | null;
};

export type AllocationMap = Record<string, number>;

export type TimeAllocation = {
  user_id: string;
  day_index: number;
  allocation: AllocationMap | JsonObject;
};
