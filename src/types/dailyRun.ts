import type { Storylet, StoryletRun } from "./storylets";
import type { AllocationMap, DailyState } from "./daily";

export type DailyRunStage =
  | "allocation"
  | "storylet_1"
  | "storylet_2"
  | "microtask"
  | "social"
  | "reflection"
  | "complete";

export type DailyRun = {
  userId: string;
  dayIndex: number;
  date: string; // UTC YYYY-MM-DD
  stage: DailyRunStage;
  allocation?: AllocationMap | null;
  storylets: Storylet[];
  storyletRunsToday: StoryletRun[];
  canBoost: boolean;
  reflectionStatus: "pending" | "done";
  microTaskStatus?: "pending" | "done" | "skipped";
  dailyState?: DailyState | null;
};
