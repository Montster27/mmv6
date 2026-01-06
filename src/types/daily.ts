import type { JsonObject, SevenVectors } from "./vectors";

export type DailyState = {
  id: string;
  user_id: string;
  day_index: number;
  energy: number;
  stress: number;
  vectors: SevenVectors | JsonObject;
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
