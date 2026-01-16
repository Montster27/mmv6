import type { JsonObject } from "@/types/vectors";

export type DailyTension = {
  user_id: string;
  day_index: number;
  key: string;
  severity: number;
  expires_day_index: number;
  resolved_at: string | null;
  meta: JsonObject | null;
};

export type SkillBank = {
  user_id: string;
  available_points: number;
  cap: number;
  last_awarded_day_index: number | null;
};

export type DailyPosture = {
  user_id: string;
  day_index: number;
  posture: "push" | "steady" | "recover" | "connect";
  created_at: string;
};
