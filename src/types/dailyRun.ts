import type { Storylet, StoryletRun } from "./storylets";
import type { AllocationMap, DailyState } from "./daily";
import type { SeasonRecap } from "./seasons";
import type { SeasonContext } from "./season";

export type DailyRunStage =
  | "allocation"
  | "storylet_1"
  | "storylet_2"
  | "microtask"
  | "social"
  | "reflection"
  | "fun_pulse"
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
  funPulseEligible?: boolean;
  funPulseDone?: boolean;
  dailyState?: DailyState | null;
  seasonResetNeeded?: boolean;
  newSeasonIndex?: number;
  seasonRecap?: SeasonRecap | null;
  seasonContext?: SeasonContext;
};
