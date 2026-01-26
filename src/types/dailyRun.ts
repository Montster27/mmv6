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
import type { AlignmentEvent, Faction } from "./factions";
import type { PlayerDayState } from "./dayState";

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
  allocationSeed?: AllocationMap | null;
  storylets: Storylet[];
  storyletRunsToday: StoryletRun[];
  canBoost: boolean;
  tensions?: DailyTension[];
  skillBank?: SkillBank | null;
  posture?: DailyPosture | null;
  allocations?: SkillPointAllocation[];
  skills?: { focus: number; memory: number; networking: number; grit: number };
  nextSkillUnlockDay?: number;
  cohortId?: string | null;
  arc?: {
    arc_key: string;
    status: "not_started" | "active" | "completed";
    title: string;
    description: string;
    current_step: number | null;
    step?:
      | {
          step_index: number;
          title: string;
          body: string;
          choices: Array<{ key: string; label: string; flags?: Record<string, boolean> }>;
        }
      | null;
  } | null;
  factions?: Faction[];
  alignment?: Record<string, number>;
  directive?: {
    faction_key: string;
    title: string;
    description: string;
    target_type: "initiative" | "arc_unlock" | "signal";
    target_key: string | null;
    week_end_day_index: number;
    status: "active" | "expired" | "completed";
  } | null;
  unlocks?: {
    arcKeys: string[];
    initiativeKeys: string[];
  };
  availableArcs?: Array<{
    key: string;
    title: string;
    description: string;
  }>;
  recentAlignmentEvents?: AlignmentEvent[];
  worldState?: {
    weekStart: number;
    weekEnd: number;
    influence: Record<string, number>;
  };
  cohortState?: {
    weekStart: number;
    weekEnd: number;
    influence: Record<string, number>;
  } | null;
  rivalry?: {
    topCohorts: Array<{ cohort_id: string; faction_key: string; score: number }>;
  };
  initiatives?: Array<Initiative & { contributedToday?: boolean; progress?: number }> | null;
  reflectionStatus: "pending" | "done";
  microTaskStatus?: "pending" | "done" | "skipped";
  funPulseEligible?: boolean;
  funPulseDone?: boolean;
  dailyState?: DailyState | null;
  dayState?: Pick<
    PlayerDayState,
    "energy" | "stress" | "money" | "study_progress" | "social_capital" | "health"
  > | null;
  lastCheck?: import("./checks").CheckResult | null;
  seasonResetNeeded?: boolean;
  newSeasonIndex?: number;
  seasonRecap?: SeasonRecap | null;
  seasonContext?: SeasonContext;
};
