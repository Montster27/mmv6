import { useCallback, useState } from "react";

import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type { DailyState } from "@/types/daily";
import type { StoryletRun } from "@/types/storylets";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "@/types/dailyInteraction";
import type { Initiative } from "@/types/initiatives";
import type { AlignmentEvent, Faction } from "@/types/factions";
import type { SeasonRecap } from "@/types/seasons";
import type { SeasonContext } from "@/types/season";
import type { AllocationPayload } from "@/lib/play";
import type { ReflectionResponse } from "@/types/reflections";
import type { PublicProfile, ReceivedBoost } from "@/lib/social";

export type DailyProgressState = {
  dailyState: DailyState | null;
  dayState: DailyRun["dayState"] | null;
  allocation: AllocationPayload;
  allocationSaved: boolean;
  storylets: any[];
  runs: StoryletRun[];
  currentIndex: number;
  loading: boolean;
  alreadyCompletedToday: boolean;
  dayIndexState: number;
  stage: DailyRunStage;
  tensions: DailyTension[];
  skillBank: SkillBank | null;
  posture: DailyPosture | null;
  skillAllocations: SkillPointAllocation[];
  seasonResetPending: boolean;
  seasonRecap: SeasonRecap | null;
  seasonIndex: number | null;
  seasonContext: SeasonContext | null;
  funPulseEligible: boolean;
  funPulseDone: boolean;
  microTaskStatus: "pending" | "done" | "skipped";
  outcomeMessage: string | null;
  outcomeDeltas: {
    energy?: number;
    stress?: number;
    vectors?: Record<string, number>;
  } | null;
  reflectionResponse?: ReflectionResponse | null;
};

export function useDailyProgress(initialAllocation: AllocationPayload) {
  const [state, setState] = useState<DailyProgressState>({
    dailyState: null,
    dayState: null,
    allocation: initialAllocation,
    allocationSaved: false,
    storylets: [],
    runs: [],
    currentIndex: 0,
    loading: true,
    alreadyCompletedToday: false,
    dayIndexState: 1,
    stage: "allocation",
    tensions: [],
    skillBank: null,
    posture: null,
    skillAllocations: [],
    seasonResetPending: false,
    seasonRecap: null,
    seasonIndex: null,
    seasonContext: null,
    funPulseEligible: false,
    funPulseDone: false,
    microTaskStatus: "pending",
    outcomeMessage: null,
    outcomeDeltas: null,
    reflectionResponse: null,
  });

  const setDailyProgress = useCallback(
    (patch: Partial<DailyProgressState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const setDailyState = useCallback(
    (dailyState: DailyState | null) => setDailyProgress({ dailyState }),
    [setDailyProgress]
  );
  const setDayState = useCallback(
    (dayState: DailyRun["dayState"] | null) => setDailyProgress({ dayState }),
    [setDailyProgress]
  );
  const setAllocation = useCallback(
    (allocation: AllocationPayload) => setDailyProgress({ allocation }),
    [setDailyProgress]
  );
  const setAllocationSaved = useCallback(
    (allocationSaved: boolean) => setDailyProgress({ allocationSaved }),
    [setDailyProgress]
  );
  const setStorylets = useCallback(
    (storylets: any[]) => setDailyProgress({ storylets }),
    [setDailyProgress]
  );
  const setRuns = useCallback(
    (next: StoryletRun[] | ((prev: StoryletRun[]) => StoryletRun[])) =>
      setState((prev) => ({
        ...prev,
        runs: typeof next === "function" ? next(prev.runs) : next,
      })),
    []
  );
  const setCurrentIndex = useCallback(
    (next: number | ((prev: number) => number)) =>
      setState((prev) => ({
        ...prev,
        currentIndex: typeof next === "function" ? next(prev.currentIndex) : next,
      })),
    []
  );
  const setLoading = useCallback(
    (loading: boolean) => setDailyProgress({ loading }),
    [setDailyProgress]
  );
  const setAlreadyCompletedToday = useCallback(
    (alreadyCompletedToday: boolean) => setDailyProgress({ alreadyCompletedToday }),
    [setDailyProgress]
  );
  const setDayIndexState = useCallback(
    (dayIndexState: number) => setDailyProgress({ dayIndexState }),
    [setDailyProgress]
  );
  const setStage = useCallback(
    (stage: DailyRunStage) => setDailyProgress({ stage }),
    [setDailyProgress]
  );
  const setTensions = useCallback(
    (tensions: DailyTension[]) => setDailyProgress({ tensions }),
    [setDailyProgress]
  );
  const setSkillBank = useCallback(
    (skillBank: SkillBank | null) => setDailyProgress({ skillBank }),
    [setDailyProgress]
  );
  const setPosture = useCallback(
    (posture: DailyPosture | null) => setDailyProgress({ posture }),
    [setDailyProgress]
  );
  const setSkillAllocations = useCallback(
    (skillAllocations: SkillPointAllocation[]) =>
      setDailyProgress({ skillAllocations }),
    [setDailyProgress]
  );
  const setSeasonResetPending = useCallback(
    (seasonResetPending: boolean) => setDailyProgress({ seasonResetPending }),
    [setDailyProgress]
  );
  const setSeasonRecap = useCallback(
    (seasonRecap: SeasonRecap | null) => setDailyProgress({ seasonRecap }),
    [setDailyProgress]
  );
  const setSeasonIndex = useCallback(
    (seasonIndex: number | null) => setDailyProgress({ seasonIndex }),
    [setDailyProgress]
  );
  const setSeasonContext = useCallback(
    (seasonContext: SeasonContext | null) => setDailyProgress({ seasonContext }),
    [setDailyProgress]
  );
  const setFunPulseEligible = useCallback(
    (funPulseEligible: boolean) => setDailyProgress({ funPulseEligible }),
    [setDailyProgress]
  );
  const setFunPulseDone = useCallback(
    (funPulseDone: boolean) => setDailyProgress({ funPulseDone }),
    [setDailyProgress]
  );
  const setMicroTaskStatus = useCallback(
    (microTaskStatus: "pending" | "done" | "skipped") =>
      setDailyProgress({ microTaskStatus }),
    [setDailyProgress]
  );
  const setOutcomeMessage = useCallback(
    (outcomeMessage: string | null) => setDailyProgress({ outcomeMessage }),
    [setDailyProgress]
  );
  const setOutcomeDeltas = useCallback(
    (
      next:
        | DailyProgressState["outcomeDeltas"]
        | ((
            prev: DailyProgressState["outcomeDeltas"]
          ) => DailyProgressState["outcomeDeltas"])
    ) =>
      setState((prev) => ({
        ...prev,
        outcomeDeltas: typeof next === "function" ? next(prev.outcomeDeltas) : next,
      })),
    []
  );

  return {
    ...state,
    setDailyProgress,
    setDailyState,
    setDayState,
    setAllocation,
    setAllocationSaved,
    setStorylets,
    setRuns,
    setCurrentIndex,
    setLoading,
    setAlreadyCompletedToday,
    setDayIndexState,
    setStage,
    setTensions,
    setSkillBank,
    setPosture,
    setSkillAllocations,
    setSeasonResetPending,
    setSeasonRecap,
    setSeasonIndex,
    setSeasonContext,
    setFunPulseEligible,
    setFunPulseDone,
    setMicroTaskStatus,
    setOutcomeMessage,
    setOutcomeDeltas,
  };
}

export type UserSocialState = {
  publicProfiles: PublicProfile[];
  selectedRecipient: string;
  boostsReceived: ReceivedBoost[];
  hasSentBoost: boolean;
  loadingSocial: boolean;
  boostMessage: string | null;
};

export function useUserSocial() {
  const [state, setState] = useState<UserSocialState>({
    publicProfiles: [],
    selectedRecipient: "",
    boostsReceived: [],
    hasSentBoost: false,
    loadingSocial: false,
    boostMessage: null,
  });

  const setUserSocial = useCallback(
    (patch: Partial<UserSocialState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const setPublicProfiles = useCallback(
    (publicProfiles: PublicProfile[]) => setUserSocial({ publicProfiles }),
    [setUserSocial]
  );
  const setSelectedRecipient = useCallback(
    (next: string | ((prev: string) => string)) =>
      setState((prev) => ({
        ...prev,
        selectedRecipient:
          typeof next === "function" ? next(prev.selectedRecipient) : next,
      })),
    []
  );
  const setBoostsReceived = useCallback(
    (boostsReceived: ReceivedBoost[]) => setUserSocial({ boostsReceived }),
    [setUserSocial]
  );
  const setHasSentBoost = useCallback(
    (hasSentBoost: boolean) => setUserSocial({ hasSentBoost }),
    [setUserSocial]
  );
  const setLoadingSocial = useCallback(
    (loadingSocial: boolean) => setUserSocial({ loadingSocial }),
    [setUserSocial]
  );
  const setBoostMessage = useCallback(
    (boostMessage: string | null) => setUserSocial({ boostMessage }),
    [setUserSocial]
  );

  return {
    ...state,
    setUserSocial,
    setPublicProfiles,
    setSelectedRecipient,
    setBoostsReceived,
    setHasSentBoost,
    setLoadingSocial,
    setBoostMessage,
  };
}

export type GameContentState = {
  factions: Faction[];
  alignment: Record<string, number>;
  directive: DailyRun["directive"] | null;
  recentAlignmentEvents: AlignmentEvent[];
  worldState: DailyRun["worldState"] | null;
  cohortState: DailyRun["cohortState"] | null;
  rivalry: DailyRun["rivalry"] | null;
  availableArcs: Array<{ key: string; title: string; description: string }>;
  cohortId: string | null;
  arc: DailyRun["arc"] | null;
  initiatives: Array<Initiative & { contributedToday?: boolean; progress?: number }>;
};

export function useGameContent() {
  const [state, setState] = useState<GameContentState>({
    factions: [],
    alignment: {},
    directive: null,
    recentAlignmentEvents: [],
    worldState: null,
    cohortState: null,
    rivalry: null,
    availableArcs: [],
    cohortId: null,
    arc: null,
    initiatives: [],
  });

  const setGameContent = useCallback(
    (patch: Partial<GameContentState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const setFactions = useCallback(
    (factions: Faction[]) => setGameContent({ factions }),
    [setGameContent]
  );
  const setAlignment = useCallback(
    (alignment: Record<string, number>) => setGameContent({ alignment }),
    [setGameContent]
  );
  const setDirective = useCallback(
    (directive: DailyRun["directive"] | null) => setGameContent({ directive }),
    [setGameContent]
  );
  const setRecentAlignmentEvents = useCallback(
    (recentAlignmentEvents: AlignmentEvent[]) =>
      setGameContent({ recentAlignmentEvents }),
    [setGameContent]
  );
  const setWorldState = useCallback(
    (worldState: DailyRun["worldState"] | null) => setGameContent({ worldState }),
    [setGameContent]
  );
  const setCohortState = useCallback(
    (cohortState: DailyRun["cohortState"] | null) => setGameContent({ cohortState }),
    [setGameContent]
  );
  const setRivalry = useCallback(
    (rivalry: DailyRun["rivalry"] | null) => setGameContent({ rivalry }),
    [setGameContent]
  );
  const setAvailableArcs = useCallback(
    (availableArcs: GameContentState["availableArcs"]) =>
      setGameContent({ availableArcs }),
    [setGameContent]
  );
  const setCohortId = useCallback(
    (cohortId: string | null) => setGameContent({ cohortId }),
    [setGameContent]
  );
  const setArc = useCallback(
    (arc: DailyRun["arc"] | null) => setGameContent({ arc }),
    [setGameContent]
  );
  const setInitiatives = useCallback(
    (initiatives: GameContentState["initiatives"]) =>
      setGameContent({ initiatives }),
    [setGameContent]
  );

  return {
    ...state,
    setGameContent,
    setFactions,
    setAlignment,
    setDirective,
    setRecentAlignmentEvents,
    setWorldState,
    setCohortState,
    setRivalry,
    setAvailableArcs,
    setCohortId,
    setArc,
    setInitiatives,
  };
}
