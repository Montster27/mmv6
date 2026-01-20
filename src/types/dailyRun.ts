import type { Storylet, StoryletRun } from "./storylets";
import type { AllocationMap, DailyState } from "./daily";
import type { SeasonRecap } from "./seasons";
import type { SeasonContext } from "./season";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "./dailyInteraction";
import type { Initiative } from "./initiatives";

export type DailyRunStage =
  | "setup"
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
  tensions?: DailyTension[];
  skillBank?: SkillBank | null;
  posture?: DailyPosture | null;
  allocations?: SkillPointAllocation[];
  cohortId?: string | null;
  arc?: {
    arcId: string;
    key: string;
    title: string;
    status: "not_started" | "active" | "completed" | "abandoned";
    currentStep: number;
  } | null;
  initiatives?: Array<Initiative & { contributedToday?: boolean; progress?: number }> | null;
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
