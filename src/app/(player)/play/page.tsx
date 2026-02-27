"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { PatternMatchTask } from "@/components/microtasks/PatternMatchTask";
import { ConsequenceMoment } from "@/components/storylets/ConsequenceMoment";
import { FunPulse } from "@/components/FunPulse";
import { FactionStatusPanel } from "@/components/play/FactionStatusPanel";
import { InitiativePanel } from "@/components/play/InitiativePanel";
import { DailySetupPanel } from "@/components/play/DailySetupPanel";
import { PlaySkeleton } from "@/components/skeletons/PlaySkeleton";
import { AllocationSection } from "@/components/play/AllocationSection";
import { ReflectionSection } from "@/components/play/ReflectionSection";
import { ArcOneReflection } from "@/components/play/ArcOneReflection";
import { TesterFeedback } from "@/components/play/TesterFeedback";
import { ensureCadenceUpToDate } from "@/lib/cadence";
import { trackEvent } from "@/lib/events";
import { supabase } from "@/lib/supabase/browser";
import { getOrCreateDailyRun } from "@/core/engine/dailyLoop";
import { awardAnomalies } from "@/lib/anomalies";
import { appendGroupFeedEvent } from "@/lib/groups/feed";
import { incrementGroupObjective } from "@/lib/groups/objective";
import { upsertFunPulse } from "@/lib/funPulse";
import { useExperiments } from "@/lib/experiments";
import { isMicrotaskEligible } from "@/core/experiments/microtaskRule";
import { fetchDevSettings, saveDevSettings } from "@/lib/devSettings";
import {
  createStoryletRun,
  fetchDailyState,
  fetchStoryletBySlug,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  markDailyComplete,
  saveTimeAllocation,
  applyOutcomeForChoice,
  toChoices,
  updateRelationships,
  type AllocationPayload,
} from "@/lib/play";
import { completeMicroTask, skipMicroTask } from "@/lib/microtasks";
import {
  fetchPublicProfiles,
  fetchTodayReceivedBoosts,
  hasSentBoostToday,
  sendBoost,
} from "@/lib/social";
import { upsertReflection } from "@/lib/reflections";
import {
  allocateSkillPoint,
  fetchTensions,
  resolveTension,
  submitPosture,
} from "@/lib/dailyInteractions";
import { fetchCohortRoster } from "@/lib/cohorts";
import { contributeToInitiative } from "@/lib/initiatives";
import {
  createCohortPost,
  fetchCohortBoard,
  markPostHelpful,
  sendCohortReply,
} from "@/lib/askOfferBoard";
import type { AskOfferPostView } from "@/types/askOffer";
import { getBuddyNudges, getOrAssignBuddy, trackBuddyNudge } from "@/lib/buddy";
import {
  fetchCompareSnapshot,
  submitRationale,
  type CompareSnapshot,
} from "@/lib/afterActionCompare";
import {
  listRemnantDefinitions,
  pickRemnantKeyForUnlock,
  selectRemnant,
  unlockRemnant,
} from "@/lib/remnants";
import { mapLegacyResourceKey, resourceLabel } from "@/core/resources/resourceMap";
import { getArcOneState } from "@/core/arcOne/state";
import {
  applyRelationshipEvents,
  ensureRelationshipDefaults,
  mapLegacyNpcKnowledge,
  mapLegacyRelationalEffects,
  migrateLegacyNpcMemory,
  renderNpcName,
} from "@/lib/relationships";
import { ARC_ONE_LAST_DAY } from "@/core/arcOne/constants";
import { skillCostForLevel } from "@/core/sim/skillProgression";
import { buildReflectionSummary, buildReplayPrompt } from "@/core/arcOne/reflection";
import type { RemnantKey } from "@/types/remnants";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type { TelemetryEvent } from "@/types/telemetry";
import type {
  DailyPosture,
} from "@/types/dailyInteraction";
import type { ReflectionResponse } from "@/types/reflections";
import { useSession } from "@/contexts/SessionContext";
import { ProgressPanel } from "@/components/ProgressPanel";
import { OutcomeExplain } from "@/components/play/OutcomeExplain";
import { SeasonBadge } from "@/components/SeasonBadge";
import { isEmailAllowed } from "@/lib/adminAuth";
import { getDailyStageCopy } from "@/lib/ui/dailyStageCopy";
import { useDailyProgress, useGameContent, useUserSocial } from "./hooks";
import { MessageCard } from "@/components/ux/MessageCard";
import { TesterOnly } from "@/components/ux/TesterOnly";
import { gameMessage, testerMessage } from "@/lib/messages";
import { getAppMode } from "@/lib/mode";
import { getFeatureFlags } from "@/lib/featureFlags";
import { useBootstrap } from "@/hooks/queries/useBootstrap";
import { useDailyRun } from "@/hooks/queries/useDailyRun";
import { matchesRequirement } from "@/core/storylets/reactionRequirements";

const DevMenu = dynamic(() => import("./DevMenu"), { ssr: false });

const defaultAllocation: AllocationPayload = {
  study: 0,
  work: 0,
  social: 0,
  health: 0,
  fun: 0,
};

const USE_DAILY_LOOP_ORCHESTRATOR = true;
const BEAT_AUTO_ADVANCE_MS: number | null = null;

export default function PlayPage() {
  const session = useSession();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const bootstrapQuery = useBootstrap();
  const {
    dailyState,
    dayState,
    allocation,
    allocationSummary,
    allocationSaved,
    storylets,
    runs,
    currentIndex,
    loading,
    alreadyCompletedToday,
    dayIndexState,
    stage,
    tensions,
    skillBank,
    posture,
    skillAllocations,
    skills,
    seasonResetPending,
    seasonRecap,
    seasonIndex,
    seasonContext,
    funPulseEligible,
    funPulseDone,
    microTaskStatus,
    outcomeMessage,
    outcomeDeltas,
    lastCheck,
    setDailyState,
    setDayState,
    setAllocation,
    setAllocationSummary,
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
    setSkills,
    setSeasonResetPending,
    setSeasonRecap,
    setSeasonIndex,
    setSeasonContext,
    setFunPulseEligible,
    setFunPulseDone,
    setMicroTaskStatus,
    setOutcomeMessage,
    setOutcomeDeltas,
    setLastCheck,
    setDailyProgress,
  } = useDailyProgress(defaultAllocation);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [savingChoice, setSavingChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    publicProfiles,
    selectedRecipient,
    boostsReceived,
    hasSentBoost,
    loadingSocial,
    boostMessage,
    setPublicProfiles,
    setSelectedRecipient,
    setBoostsReceived,
    setHasSentBoost,
    setLoadingSocial,
    setBoostMessage,
    setUserSocial,
  } = useUserSocial();
  const [allocatingSkill, setAllocatingSkill] = useState(false);
  const [submittingPosture, setSubmittingPosture] = useState(false);
  const [setupActionError, setSetupActionError] = useState<string | null>(null);
  const [dayRolloverNotice, setDayRolloverNotice] = useState<string | null>(null);
  const {
    factions,
    alignment,
    directive,
    recentAlignmentEvents,
    worldState,
    cohortState,
    rivalry,
    cohortId,
    initiatives,
    setFactions,
    setAlignment,
    setDirective,
    setRecentAlignmentEvents,
    setWorldState,
    setCohortState,
    setRivalry,
    setCohortId,
    setInitiatives,
    setGameContent,
  } = useGameContent();
  const [initiativeSubmitting, setInitiativeSubmitting] = useState(false);
  const [funPulseSaving, setFunPulseSaving] = useState(false);
  const [bootstrapAssignments, setBootstrapAssignments] = useState<
    Record<string, string>
  >({});
  const [bootstrapIsAdmin, setBootstrapIsAdmin] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapUserId, setBootstrapUserId] = useState<string | null>(null);
  const { assignments, getVariant, ready: experimentsReady } = useExperiments(
    ["microtask_freq_v1"],
    bootstrapAssignments
  );
  const microtaskVariant = getVariant("microtask_freq_v1", "A");
  const experiments = useMemo(() => assignments, [assignments]);
  const servedStoryletsRef = useRef<string | null>(null);
  const [showDevMenu, setShowDevMenu] = useState(() => getAppMode().testerMode);
  const [refreshTick, setRefreshTick] = useState(0);
  const [featureFlagsVersion, setFeatureFlagsVersion] = useState(0);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devIsAdmin, setDevIsAdmin] = useState(false);
  const [devSettingsLoading, setDevSettingsLoading] = useState(false);
  const [devSettingsSaving, setDevSettingsSaving] = useState(false);
  const [devSettings, setDevSettings] = useState({ test_mode: false });
  const [devCharacters, setDevCharacters] = useState<
    Array<{
      user_id: string;
      email: string | null;
      username: string | null;
      is_admin: boolean;
      day_index: number | null;
      created_at: string;
    }>
  >([]);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [advancingUserId, setAdvancingUserId] = useState<string | null>(null);
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [arcOneReflectionSaving, setArcOneReflectionSaving] = useState(false);
  const [askOfferPosts, setAskOfferPosts] = useState<AskOfferPostView[]>([]);
  const [askOfferLoading, setAskOfferLoading] = useState(false);
  const [askOfferError, setAskOfferError] = useState<string | null>(null);
  const [askOfferType, setAskOfferType] = useState<"ask" | "offer">("ask");
  const [askOfferBody, setAskOfferBody] = useState("");
  const [askOfferPosting, setAskOfferPosting] = useState(false);
  const [replyNotes, setReplyNotes] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const [helpfulSending, setHelpfulSending] = useState<Record<string, boolean>>({});
  const [buddyAssignment, setBuddyAssignment] = useState<{
    buddy_type: "human" | "ai";
    buddy_user_id: string | null;
  } | null>(null);
  const [buddyNudge, setBuddyNudge] = useState<string | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState<CompareSnapshot | null>(
    null
  );
  const [compareVisible, setCompareVisible] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareChoiceId, setCompareChoiceId] = useState<string | null>(null);
  const [compareNote, setCompareNote] = useState("");
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [pendingReactionText, setPendingReactionText] = useState<string | null>(
    null
  );
  const [pendingAdvanceTarget, setPendingAdvanceTarget] = useState<string | null>(
    null
  );
  const [compareSending, setCompareSending] = useState(false);
  const [remnantState, setRemnantState] = useState<DailyRun["remnant"] | null>(
    null
  );
  const [testerEventLog, setTesterEventLog] = useState<TelemetryEvent[]>([]);
  const [runResetting, setRunResetting] = useState(false);
  const sessionIdRef = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
  const remnantAppliedRef = useRef(false);
  const nextRunTrackedRef = useRef(false);
  const remnantUnlockAttemptedRef = useRef(false);
  const firstChoiceTrackedRef = useRef(false);
  const cliffhangerShownRef = useRef(false);
  const [cohortRoster, setCohortRoster] = useState<{
    count: number;
    handles: string[];
  } | null>(null);

  const SLICE_PHASES_LOCAL = useMemo(
    () => [
      { id: "intro_hook", label: "Intro hook", window: [0, 3] as const },
      { id: "guided_core_loop", label: "Guided core loop", window: [3, 10] as const },
      { id: "reflection_arc", label: "Reflection arc", window: [10, 18] as const },
      { id: "community_purpose", label: "Community purpose", window: [18, 24] as const },
      { id: "remnant_reveal", label: "Remnant reveal", window: [24, 28] as const },
      { id: "cliffhanger", label: "Cliffhanger", window: [28, 30] as const },
    ],
    []
  );

  const getSlicePhaseLocal = useCallback(
    (params: {
      elapsedMinutes: number;
      allocationSaved: boolean;
      storyletRuns: number;
      socialComplete: boolean;
      reflectionDone: boolean;
    }) => {
      const {
        elapsedMinutes,
        allocationSaved,
        storyletRuns,
        socialComplete,
        reflectionDone,
      } = params;

      const timePhase =
        elapsedMinutes < 3
          ? "intro_hook"
          : elapsedMinutes < 10
            ? "guided_core_loop"
            : elapsedMinutes < 18
              ? "reflection_arc"
              : elapsedMinutes < 24
                ? "community_purpose"
                : elapsedMinutes < 28
                  ? "remnant_reveal"
                  : "cliffhanger";

      let criteriaPhase = "intro_hook";
      if (allocationSaved) criteriaPhase = "guided_core_loop";
      if (storyletRuns >= 1) criteriaPhase = "reflection_arc";
      if (storyletRuns >= 2 || reflectionDone) criteriaPhase = "community_purpose";
      if (socialComplete) criteriaPhase = "remnant_reveal";
      if (elapsedMinutes >= 28) criteriaPhase = "cliffhanger";

      const order = [
        "intro_hook",
        "guided_core_loop",
        "reflection_arc",
        "community_purpose",
        "remnant_reveal",
        "cliffhanger",
      ];
      const timeIndex = order.indexOf(timePhase);
      const criteriaIndex = order.indexOf(criteriaPhase);
      return order[Math.max(timeIndex, criteriaIndex)] ?? "cliffhanger";
    },
    []
  );

  const isAdmin =
    Boolean(session?.user?.email && isEmailAllowed(session.user.email)) ||
    devIsAdmin ||
    bootstrapIsAdmin;
  const dailyRunQuery = useDailyRun(bootstrapUserId, {
    experiments,
    microtaskVariant,
    isAdmin,
    enabled:
      USE_DAILY_LOOP_ORCHESTRATOR &&
      bootstrapReady &&
      experimentsReady &&
      !!bootstrapUserId,
    refreshKey: refreshTick,
  });

  useEffect(() => {
    if (bootstrapQuery.isError) {
      setError("Failed to load play state.");
      return;
    }
    if (!bootstrapQuery.data) return;
    setBootstrapReady(true);
    setBootstrapUserId(bootstrapQuery.data.userId);
    setBootstrapIsAdmin(Boolean(bootstrapQuery.data.isAdmin));
    setBootstrapAssignments(bootstrapQuery.data.experiments ?? {});
    setUserId(bootstrapQuery.data.userId);
  }, [bootstrapQuery.data, bootstrapQuery.isError]);

  const testerMode = useMemo(() => getAppMode().testerMode, []);
  const phaseRef = useRef<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const featureFlags = useMemo(() => getFeatureFlags(), [featureFlagsVersion]);
  const slicePhaseId = useMemo(() => {
    if (!featureFlags.verticalSlice30Enabled) return null;
    return phaseRef.current;
  }, [
    featureFlags.verticalSlice30Enabled,
    stage,
    allocationSaved,
    runs.length,
    hasSentBoost,
  ]);
  const slicePhaseLabel = useMemo(() => {
    if (!featureFlags.verticalSlice30Enabled) return null;
    const phaseId = phaseRef.current;
    if (!phaseId) return null;
    return (
      SLICE_PHASES_LOCAL.find((phase) => phase.id === phaseId)?.label ?? phaseId
    );
  }, [
    featureFlags.verticalSlice30Enabled,
    stage,
    allocationSaved,
    runs.length,
    hasSentBoost,
    SLICE_PHASES_LOCAL,
  ]);
  const remnantDefinitions = useMemo(() => listRemnantDefinitions(), []);
  const testerNote = useMemo(
    () =>
      testerMessage("Tester: Set posture, allocate time, then pick a storylet.", {
        tone: "warning",
      }),
    []
  );
  const [testerMessages, setTesterMessages] = useState<
    Array<ReturnType<typeof testerMessage>>
  >([]);
  const testerFastForwardNote = useMemo(
    () => testerMessage("Test mode only.", { tone: "warning" }),
    []
  );
  const [testerDeltaNote, setTesterDeltaNote] = useState<string | null>(null);
  const testerDeltaMessage = useMemo(
    () =>
      testerDeltaNote
        ? testerMessage(testerDeltaNote, { tone: "neutral" })
        : null,
    [testerDeltaNote]
  );
  const pendingDeltaSourceRef = useRef<string | null>(null);
  const previousDayStateRef = useRef<{ energy: number; stress: number } | null>(
    null
  );
  const hoverStartRef = useRef<Record<string, number | null>>({});
  const stagePauseTimerRef = useRef<number | null>(null);
  const stageInteractionRef = useRef(false);
  const sessionStartAtRef = useRef<number | null>(null);
  const [lastCompletedStage, setLastCompletedStage] =
    useState<DailyRunStage | null>(null);
  const [testerStageResponses, setTesterStageResponses] = useState<
    Record<string, string>
  >({});
  const [relDebugEvents, setRelDebugEvents] = useState<
    Array<{
      id?: string;
      created_at?: string;
      event_type: string;
      delta?: Record<string, unknown> | null;
      meta?: Record<string, unknown> | null;
    }>
  >([]);
  const [relDebugFilter, setRelDebugFilter] = useState<
    "all" | "relational" | "flags"
  >("all");
  const [lastRelSummary, setLastRelSummary] = useState<string[]>([]);
  const seasonResetGameNote = useMemo(
    () =>
      gameMessage("The ledger blurs. You begin again with what you can hold.", {
        tone: "neutral",
      }),
    []
  );
  const seasonResetTesterNote = useMemo(
    () =>
      testerMessage(
        "Tester: Season reset clears the daily ledger (energy, stress, vectors).",
        { tone: "warning" }
      ),
    []
  );
  const [microTaskSaving, setMicroTaskSaving] = useState(false);
  const [consequenceActive, setConsequenceActive] = useState(false);
  const sessionStartTracked = useRef(false);
  const sessionEndTracked = useRef(false);
  const stageRef = useRef<DailyRunStage | null>(null);
  const stageStartedAtRef = useRef<number | null>(null);
  const latestStageRef = useRef<DailyRunStage | null>(null);
  const latestDayIndexRef = useRef<number | null>(null);
  const lastRunDayIndexRef = useRef<number | null>(null);
  const microTaskStartTracked = useRef(false);
  const funPulseShownTracked = useRef(false);
  const pendingTransitionRef = useRef<(() => void) | null>(null);

  const dayIndex = useMemo(
    () => dailyState?.day_index ?? dayIndexState,
    [dailyState?.day_index, dayIndexState]
  );
  const microTaskEligible = useMemo(
    () => isMicrotaskEligible(dayIndex, microtaskVariant),
    [dayIndex, microtaskVariant]
  );

  const arcOneMode = useMemo(
    () =>
      featureFlags.arcOneScarcityEnabled && dayIndex <= ARC_ONE_LAST_DAY,
    [featureFlags.arcOneScarcityEnabled, dayIndex]
  );
  const beatBufferEnabled = Boolean(featureFlags.beatBufferEnabled);
  const relationshipDebugEnabled = Boolean(featureFlags.relationshipDebugEnabled);
  const npcNameForId = useCallback((npcId: string) => {
    if (npcId === "npc_roommate_dana") return "Dana";
    if (npcId === "npc_connector_miguel") return "Miguel";
    return npcId;
  }, []);
  const arcOneState = useMemo(
    () => (arcOneMode ? getArcOneState(dailyState) : null),
    [arcOneMode, dailyState]
  );
  const relationshipsState = useMemo(
    () => arcOneState?.relationships ?? {},
    [arcOneState?.relationships]
  );
  useEffect(() => {
    if (!arcOneMode || !dailyState || !userId) return;
    const { next: migrated, changed: migratedChanged } = migrateLegacyNpcMemory(
      relationshipsState,
      dailyState.npc_memory as Record<string, unknown>
    );
    const { next: ensured, changed: ensuredChanged } =
      ensureRelationshipDefaults(migrated);
    if (!migratedChanged && !ensuredChanged) return;
    updateRelationships(userId, ensured, dayIndex)
      .then(() => {
        setDailyState((dailyState ?? null)
          ? { ...(dailyState as any), relationships: ensured }
          : (dailyState as any));
      })
      .catch((err) => {
        console.error("Failed to ensure relationship defaults", err);
      });
  }, [arcOneMode, dailyState?.id, userId, dayIndex, relationshipsState]);
  const arcOneReflectionReady = Boolean(
    arcOneMode &&
      arcOneState &&
      dayIndex >= ARC_ONE_LAST_DAY &&
      !arcOneState.reflectionDone
  );
  const arcOneReflectionLines = useMemo(
    () =>
      arcOneReflectionReady && arcOneState
        ? buildReflectionSummary({ arcOneState, moneyBandHistory: [] })
        : [],
    [arcOneReflectionReady, arcOneState]
  );
  const skillUiEnabled = useMemo(() => {
    if (!featureFlags.skills || arcOneMode) return false;
    const unlockDay = dailyRunQuery.data?.nextSkillUnlockDay ?? 2;
    if (dayIndex < unlockDay) return false;
    const levels = {
      focus: skills?.focus ?? 0,
      memory: skills?.memory ?? 0,
      networking: skills?.networking ?? 0,
      grit: skills?.grit ?? 0,
    };
    const minCost = Math.min(
      skillCostForLevel(levels.focus + 1),
      skillCostForLevel(levels.memory + 1),
      skillCostForLevel(levels.networking + 1),
      skillCostForLevel(levels.grit + 1)
    );
    return (skillBank?.available_points ?? 0) >= minCost;
  }, [
    featureFlags.skills,
    arcOneMode,
    dayIndex,
    dailyRunQuery.data?.nextSkillUnlockDay,
    skills,
    skillBank,
  ]);

  const formatRelDelta = (delta: Record<string, unknown> | null | undefined) => {
    if (!delta) return "{}";
    const entries = Object.entries(delta).map(([key, value]) => {
      if (typeof value === "number") {
        const prefix = value > 0 ? "+" : "";
        return `"${key}": ${prefix}${value}`;
      }
      if (typeof value === "boolean") {
        return `"${key}": ${value ? "true" : "false"}`;
      }
      return `"${key}": "${String(value)}"`;
    });
    return `{ ${entries.join(", ")} }`;
  };

  const filteredRelEvents = useMemo(() => {
    if (relDebugFilter === "all") return relDebugEvents;
    return relDebugEvents.filter((event) => {
      const kind = (event.meta as any)?.kind;
      if (relDebugFilter === "relational") return kind === "relational";
      return kind === "npc_memory";
    });
  }, [relDebugEvents, relDebugFilter]);
  const showDailyComplete =
    (USE_DAILY_LOOP_ORCHESTRATOR && stage === "complete") ||
    (!USE_DAILY_LOOP_ORCHESTRATOR && alreadyCompletedToday);

  const loadDevCharacters = async () => {
    setDevLoading(true);
    setDevError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setDevError("No session found.");
        return;
      }
      const res = await fetch("/api/admin/dev/characters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load characters.");
      }
      setDevCharacters(json.characters ?? []);
    } catch (e) {
      console.error(e);
      setDevError(e instanceof Error ? e.message : "Failed to load characters.");
    } finally {
      setDevLoading(false);
    }
  };

  const loadAdminFlag = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("Failed to load admin flag", error);
        return;
      }
      setDevIsAdmin(Boolean(data?.is_admin));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetAccount = async (userId: string) => {
    setResettingUserId(userId);
    setDevError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setDevError("No session found.");
        return;
      }
      const res = await fetch("/api/admin/dev/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to reset account.");
      }
      await loadDevCharacters();
    } catch (e) {
      console.error(e);
      setDevError(e instanceof Error ? e.message : "Failed to reset account.");
    } finally {
      setResettingUserId(null);
    }
  };

  const handleAdvanceDay = async (userId: string) => {
    setAdvancingUserId(userId);
    setDevError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setDevError("No session found.");
        return;
      }
      const res = await fetch("/api/admin/dev/next-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to advance day.");
      }
      await loadDevCharacters();
    } catch (e) {
      console.error(e);
      setDevError(e instanceof Error ? e.message : "Failed to advance day.");
    } finally {
      setAdvancingUserId(null);
    }
  };

  const handleToggleAdmin = async (userId: string, nextValue: boolean) => {
    setTogglingAdminId(userId);
    setDevError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setDevError("No session found.");
        return;
      }
      const res = await fetch("/api/admin/dev/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, is_admin: nextValue }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update admin flag.");
      }
      await loadDevCharacters();
    } catch (e) {
      console.error(e);
      setDevError(e instanceof Error ? e.message : "Failed to update admin flag.");
    } finally {
      setTogglingAdminId(null);
    }
  };

  useEffect(() => {
    latestStageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (Number.isFinite(dayIndex)) {
      latestDayIndexRef.current = dayIndex;
    }
  }, [dayIndex]);

  useEffect(() => {
    microTaskStartTracked.current = false;
    funPulseShownTracked.current = false;
    pendingTransitionRef.current = null;
    setConsequenceActive(false);
  }, [dayIndex]);

  useEffect(() => {
    if (!userId) return;
    loadAdminFlag(userId);
  }, [userId]);

  const finishConsequence = () => {
    setConsequenceActive(false);
    setOutcomeMessage(null);
    setOutcomeDeltas(null);
    const next = pendingTransitionRef.current;
    pendingTransitionRef.current = null;
    if (next) next();
  };

  useEffect(() => {
    const init = async () => {
      if (!bootstrapReady || !bootstrapUserId) return;
      if (USE_DAILY_LOOP_ORCHESTRATOR) {
        if (!experimentsReady) return;
        if (dailyRunQuery.isLoading) {
          setLoading(true);
          return;
        }
        if (dailyRunQuery.isError) {
          setError("Failed to load play state.");
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setError(null);
      try {
        if (USE_DAILY_LOOP_ORCHESTRATOR) {
          const run = dailyRunQuery.data;
          if (!run) return;
          if (
            typeof lastRunDayIndexRef.current === "number" &&
            lastRunDayIndexRef.current !== run.dayIndex
          ) {
            setDayRolloverNotice("New day has started.");
          }
          lastRunDayIndexRef.current = run.dayIndex;
          setDailyProgress({
            dayIndexState: run.dayIndex,
            stage: run.stage,
            alreadyCompletedToday: run.stage === "complete",
            tensions: run.tensions ?? [],
            skillBank: run.skillBank ?? null,
            posture: run.posture ?? null,
            skillAllocations: run.allocations ?? [],
            skills: run.skills ?? null,
            storylets: run.storylets,
            runs: run.storyletRunsToday,
            dayState: run.dayState ?? null,
            allocationSaved: Boolean(run.allocation),
            allocation: {
              ...defaultAllocation,
              ...(run.allocation ?? run.allocationSeed ?? {}),
            },
            allocationSummary: {
              ...defaultAllocation,
              ...(run.allocation ?? run.allocationSeed ?? {}),
            },
            microTaskStatus: run.microTaskStatus ?? "pending",
            seasonContext: run.seasonContext ?? null,
            funPulseEligible: Boolean(run.funPulseEligible),
            funPulseDone: Boolean(run.funPulseDone),
            seasonResetPending: Boolean(run.seasonResetNeeded),
            seasonIndex: run.seasonResetNeeded ? run.newSeasonIndex ?? null : null,
            seasonRecap: run.seasonResetNeeded ? run.seasonRecap ?? null : null,
          });
          setGameContent({
            initiatives: run.initiatives ?? [],
            factions: run.factions ?? [],
            alignment: run.alignment ?? {},
            directive: run.directive ?? null,
            recentAlignmentEvents: run.recentAlignmentEvents ?? [],
            worldState: run.worldState ?? null,
            cohortState: run.cohortState ?? null,
            rivalry: run.rivalry ?? null,
            cohortId: run.cohortId ?? null,
          });
          setRemnantState(run.remnant ?? null);
          setUserSocial({ hasSentBoost: !run.canBoost });
          const ds =
            run.dailyState ?? (await fetchDailyState(bootstrapUserId));
          if (ds) {
            setDailyState({ ...ds, day_index: run.dayIndex });
            if (!run.dayState) {
              setDayState({
                energy: ds.energy,
                stress: ds.stress,
                cashOnHand: 0,
                knowledge: 0,
                socialLeverage: 0,
                physicalResilience: 50,
                total_study: 0,
                total_work: 0,
                total_social: 0,
                total_health: 0,
                total_fun: 0,
              });
            }
          }

          const servedKey = `${run.dayIndex}:${run.storylets
            .map((s) => s.id)
            .join(",")}`;
          if (servedStoryletsRef.current !== servedKey) {
            servedStoryletsRef.current = servedKey;
            run.storylets.forEach((storylet) => {
              const audience = (storylet.requirements as any)?.audience;
              trackWithSeason({
                event_type: "storylet_served",
                day_index: run.dayIndex,
                stage: run.stage,
                payload: {
                  storylet_id: storylet.id,
                  storylet_slug: storylet.slug,
                  audience: audience ?? null,
                },
              });
            });
          }

          const [profiles, received] = await Promise.all([
            fetchPublicProfiles(bootstrapUserId),
            fetchTodayReceivedBoosts(bootstrapUserId, run.dayIndex),
          ]);
          setUserSocial({
            publicProfiles: profiles,
            selectedRecipient: profiles[0]?.user_id ?? "",
            boostsReceived: received,
          });
        } else {
          const cadence = await ensureCadenceUpToDate(bootstrapUserId);
          setDailyProgress({
            dayIndexState: cadence.dayIndex,
            alreadyCompletedToday: cadence.alreadyCompletedToday,
            seasonContext: null,
          });
          setRemnantState(null);

          const day = cadence.dayIndex;
          const [ds, existingAllocation, existingRuns, candidates] = await Promise.all([
            fetchDailyState(bootstrapUserId),
            fetchTimeAllocation(bootstrapUserId, day),
            fetchTodayRuns(bootstrapUserId, day),
            fetchTodayStoryletCandidates(),
          ]);
          if (ds) {
            setDailyState({ ...ds, day_index: cadence.dayIndex });
            setDayState({
              energy: ds.energy,
              stress: ds.stress,
              cashOnHand: 0,
              knowledge: 0,
              socialLeverage: 0,
              physicalResilience: 50,
              total_study: 0,
              total_work: 0,
              total_social: 0,
              total_health: 0,
              total_fun: 0,
            });
          }

          if (existingAllocation) {
            setDailyProgress({
              allocation: { ...defaultAllocation, ...existingAllocation },
              allocationSummary: { ...defaultAllocation, ...existingAllocation },
              allocationSaved: true,
            });
          } else {
            setDailyProgress({
              allocation: { ...defaultAllocation },
              allocationSummary: { ...defaultAllocation },
              allocationSaved: false,
            });
          }

          setRuns(existingRuns);

          const used = new Set(existingRuns.map((r) => r.storylet_id));
          const next = candidates.filter((c) => !used.has(c.id)).slice(0, 3);
          const entrySlug = "s1_dorm_wake_dislocation";
          const shouldForceEntry =
            featureFlags.arcOneScarcityEnabled &&
            day <= ARC_ONE_LAST_DAY &&
            day === 1;
          let entryStorylet = shouldForceEntry
            ? candidates.find((c) => c.slug === entrySlug)
            : null;
          if (shouldForceEntry && !entryStorylet) {
            entryStorylet = await fetchStoryletBySlug(entrySlug);
          }
          const nextStorylets = entryStorylet
            ? [entryStorylet, ...next.filter((c) => c.id !== entryStorylet.id)].slice(
                0,
                3
              )
            : next;
          setStorylets(nextStorylets);

          const allocationExists = Boolean(existingAllocation);
          const [profiles, received, sent] = await Promise.all([
            fetchPublicProfiles(bootstrapUserId),
            fetchTodayReceivedBoosts(bootstrapUserId, day),
            hasSentBoostToday(bootstrapUserId, day),
          ]);
          setUserSocial({
            publicProfiles: profiles,
            selectedRecipient: profiles[0]?.user_id ?? "",
            boostsReceived: received,
            hasSentBoost: sent,
          });
          setStage(
            cadence.alreadyCompletedToday
              ? "complete"
              : allocationExists
              ? "storylet_1"
              : "allocation"
          );
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load play state.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [
    bootstrapReady,
    bootstrapUserId,
    experimentsReady,
    dailyRunQuery.data,
    dailyRunQuery.isLoading,
    dailyRunQuery.isError,
    refreshTick,
  ]);

  const handleFastForward = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/test/advance-day", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to advance day.");
      }
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to advance day.");
    } finally {
      setLoading(false);
    }
  };

  const loadDevSettings = async (currentUserId: string) => {
    setDevSettingsLoading(true);
    try {
      const settings = await fetchDevSettings(currentUserId);
      setDevSettings(settings);
    } catch (e) {
      console.error(e);
    } finally {
      setDevSettingsLoading(false);
    }
  };

  const handleToggleTestMode = async () => {
    if (!bootstrapUserId) return;
    const next = { ...devSettings, test_mode: !devSettings.test_mode };
    setDevSettingsSaving(true);
    try {
      await saveDevSettings(bootstrapUserId, next);
      setDevSettings(next);
    } catch (e) {
      console.error(e);
      setError("Failed to update dev settings.");
    } finally {
      setDevSettingsSaving(false);
    }
  };

  const trackWithSeason = (params: {
    event_type: string;
    day_index?: number;
    stage?: string;
    payload?: Record<string, unknown>;
  }) => {
    const seasonIndexValue = seasonContext?.currentSeason.season_index;
    const payload = {
      ...(params.payload ?? {}),
      ...(seasonIndexValue ? { season_index: seasonIndexValue } : {}),
      session_id: sessionIdRef.current,
      phase: slicePhaseId ?? null,
      ...(cohortId ? { cohort_id: cohortId } : {}),
    };
    if (testerMode) {
      const eventRecord: TelemetryEvent = {
        event_type: params.event_type,
        day_index: params.day_index,
        stage: params.stage ?? null,
        payload,
        ts: new Date().toISOString(),
      };
      setTesterEventLog((prev) => [eventRecord, ...prev].slice(0, 25));
    }
    trackEvent({
      ...params,
      payload,
    });
  };

  const recordInteraction = () => {
    stageInteractionRef.current = true;
  };

  const startHover = (key: string) => {
    if (!userId) return;
    if (hoverStartRef.current[key]) return;
    hoverStartRef.current[key] = Date.now();
  };

  const endHover = (key: string) => {
    if (!userId) return;
    const startedAt = hoverStartRef.current[key];
    if (!startedAt) return;
    hoverStartRef.current[key] = null;
    trackWithSeason({
      event_type: "ui_focus",
      day_index: dayIndex,
      stage,
      payload: { element: key, duration_ms: Date.now() - startedAt },
    });
  };

  useEffect(() => {
    if (!userId || loading || sessionStartTracked.current) return;
    sessionStartTracked.current = true;
    sessionStartAtRef.current = Date.now();
    trackWithSeason({ event_type: "session_start", day_index: dayIndex, stage });
  }, [userId, dayIndex, stage, loading, seasonContext]);

  const refreshAskOfferBoard = useCallback(async () => {
    if (!userId || !cohortId || !featureFlags.askOfferBoardEnabled) return;
    setAskOfferLoading(true);
    setAskOfferError(null);
    try {
      const res = await fetchCohortBoard(cohortId, userId);
      setAskOfferPosts(res.posts);
    } catch (err) {
      console.error(err);
      setAskOfferError("Unable to load the board right now.");
    } finally {
      setAskOfferLoading(false);
    }
  }, [userId, cohortId, featureFlags.askOfferBoardEnabled]);

  useEffect(() => {
    if (!featureFlags.askOfferBoardEnabled || !cohortId || !userId) return;
    refreshAskOfferBoard();
  }, [featureFlags.askOfferBoardEnabled, cohortId, userId, refreshAskOfferBoard]);

  const handleCreateAskOffer = async () => {
    if (!userId || !cohortId) return;
    setAskOfferPosting(true);
    setAskOfferError(null);
    const res = await createCohortPost({
      cohortId,
      userId,
      postType: askOfferType,
      body: askOfferBody,
    });
    if (!res.ok) {
      setAskOfferError(res.error ?? "Unable to post right now.");
      setAskOfferPosting(false);
      return;
    }
    setAskOfferBody("");
    await refreshAskOfferBoard();
    setAskOfferPosting(false);
  };

  const handleSendReply = async (postId: string, templateKey: string) => {
    if (!userId) return;
    setReplySending((prev) => ({ ...prev, [postId]: true }));
    const res = await sendCohortReply({
      postId,
      userId,
      templateKey,
      body: replyNotes[postId],
    });
    if (!res.ok) {
      setAskOfferError(res.error ?? "Unable to send reply.");
      setReplySending((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    setReplyNotes((prev) => ({ ...prev, [postId]: "" }));
    await refreshAskOfferBoard();
    setReplySending((prev) => ({ ...prev, [postId]: false }));
  };

  const handleHelpful = async (postId: string) => {
    if (!userId) return;
    setHelpfulSending((prev) => ({ ...prev, [postId]: true }));
    const res = await markPostHelpful({ postId, userId });
    if (!res.ok) {
      setAskOfferError(res.error ?? "Unable to save reaction.");
      setHelpfulSending((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    await refreshAskOfferBoard();
    setHelpfulSending((prev) => ({ ...prev, [postId]: false }));
  };

  useEffect(() => {
    if (!testerMode || !featureFlags.rookieCircleEnabled || !cohortId) {
      setCohortRoster(null);
      return;
    }
    let active = true;
    fetchCohortRoster(cohortId)
      .then((roster) => {
        if (active) setCohortRoster(roster);
      })
      .catch(() => {
        if (active) setCohortRoster(null);
      });
    return () => {
      active = false;
    };
  }, [testerMode, featureFlags.rookieCircleEnabled, cohortId]);

  useEffect(() => {
    if (!featureFlags.buddySystemEnabled || !cohortId || !userId) {
      setBuddyAssignment(null);
      return;
    }
    let active = true;
    getOrAssignBuddy(userId, cohortId)
      .then((assignment) => {
        if (!active) return;
        setBuddyAssignment({
          buddy_type: assignment.buddy_type,
          buddy_user_id: assignment.buddy_user_id,
        });
      })
      .catch((err) => {
        console.error(err);
        if (active) setBuddyAssignment(null);
      });
    return () => {
      active = false;
    };
  }, [featureFlags.buddySystemEnabled, cohortId, userId]);

  useEffect(() => {
    if (!featureFlags.remnantSystemEnabled) return;
    if (dayIndex === 1 && !nextRunTrackedRef.current) {
      trackWithSeason({ event_type: "next_run_started", day_index: dayIndex });
      nextRunTrackedRef.current = true;
    }
  }, [featureFlags.remnantSystemEnabled, dayIndex]);

  useEffect(() => {
    if (!featureFlags.remnantSystemEnabled) return;
    if (remnantState?.applied && !remnantAppliedRef.current) {
      remnantAppliedRef.current = true;
      trackWithSeason({
        event_type: "remnant_applied",
        day_index: dayIndex,
        payload: { remnant_key: remnantState.active?.key ?? null },
      });
    }
  }, [featureFlags.remnantSystemEnabled, remnantState, dayIndex]);

  useEffect(() => {
    if (!featureFlags.verticalSlice30Enabled) return;
    if (slicePhaseId !== "cliffhanger") return;
    if (cliffhangerShownRef.current) return;
    cliffhangerShownRef.current = true;
    trackWithSeason({ event_type: "cliffhanger_shown", day_index: dayIndex });
  }, [featureFlags.verticalSlice30Enabled, slicePhaseId, dayIndex]);

  useEffect(() => {
    if (!featureFlags.remnantSystemEnabled || !userId) return;
    if (slicePhaseId !== "remnant_reveal") return;
    if (remnantState?.unlocked?.length) return;
    if (remnantUnlockAttemptedRef.current) return;
    remnantUnlockAttemptedRef.current = true;
    const key = pickRemnantKeyForUnlock({
      dailyState,
      dayState: null,
    });
    unlockRemnant(userId, key).then((created) => {
      if (!created) return;
      const def = listRemnantDefinitions().find((rem) => rem.key === key) ?? null;
      if (def) {
        setRemnantState({
          unlocked: [def],
          active: remnantState?.active ?? null,
          applied: false,
        });
        trackWithSeason({
          event_type: "remnant_discovered",
          day_index: dayIndex,
          payload: { remnant_key: key },
        });
        trackWithSeason({
          event_type: "remnant_earned",
          day_index: dayIndex,
          payload: { remnant_key: key },
        });
      }
    });
  }, [
    featureFlags.remnantSystemEnabled,
    slicePhaseId,
    userId,
    dailyState,
    dayState,
    remnantState,
    dayIndex,
  ]);

  useEffect(() => {
    if (!featureFlags.verticalSlice30Enabled) return;
    if (!sessionStartAtRef.current) return;
    if (!userId || loading) return;
    const elapsedMinutes = (Date.now() - sessionStartAtRef.current) / 60000;
    const phase = getSlicePhaseLocal({
      elapsedMinutes,
      allocationSaved,
      storyletRuns: runs.length,
      socialComplete: Boolean(hasSentBoost),
      reflectionDone: stage === "complete" || stage === "reflection",
    });
    if (phaseRef.current !== phase) {
      if (phaseRef.current) {
        trackWithSeason({
          event_type: "phase_completed",
          day_index: dayIndex,
          stage: phaseRef.current,
        });
      }
      phaseRef.current = phase;
      trackWithSeason({
        event_type: "phase_entered",
        day_index: dayIndex,
        stage: phase,
      });
    }
  }, [
    featureFlags.verticalSlice30Enabled,
    userId,
    loading,
    dayIndex,
    allocationSaved,
    runs.length,
    hasSentBoost,
    stage,
  ]);

  useEffect(() => {
    if (!userId || loading) return;
    const now = Date.now();
    const previousStage = stageRef.current;

    if (!previousStage) {
      stageRef.current = stage;
      stageStartedAtRef.current = now;
      trackWithSeason({ event_type: "stage_enter", day_index: dayIndex, stage });
      stageInteractionRef.current = false;
      if (stagePauseTimerRef.current) {
        window.clearTimeout(stagePauseTimerRef.current);
      }
      stagePauseTimerRef.current = window.setTimeout(() => {
        if (!stageInteractionRef.current && stageRef.current === stage) {
          trackWithSeason({
            event_type: "stage_pause",
            day_index: dayIndex,
            stage,
            payload: { duration_ms: 5000 },
          });
        }
      }, 5000);
      return;
    }

    if (previousStage === stage) {
      return;
    }

    const startedAt = stageStartedAtRef.current;
    if (startedAt) {
      trackWithSeason({
        event_type: "stage_complete",
        day_index: dayIndex,
        stage: previousStage,
        payload: { duration_ms: now - startedAt },
      });
      setLastCompletedStage(previousStage);
    }

    stageRef.current = stage;
    stageStartedAtRef.current = now;
    trackWithSeason({ event_type: "stage_enter", day_index: dayIndex, stage });
    stageInteractionRef.current = false;
    if (stagePauseTimerRef.current) {
      window.clearTimeout(stagePauseTimerRef.current);
    }
    stagePauseTimerRef.current = window.setTimeout(() => {
      if (!stageInteractionRef.current && stageRef.current === stage) {
        trackWithSeason({
          event_type: "stage_pause",
          day_index: dayIndex,
          stage,
          payload: { duration_ms: 5000 },
        });
      }
    }, 5000);

    if (stage === "complete" && !sessionEndTracked.current) {
      sessionEndTracked.current = true;
      trackWithSeason({ event_type: "session_end", day_index: dayIndex, stage });
    }
  }, [stage, userId, dayIndex, loading]);

  useEffect(() => {
    if (!userId) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      if (sessionEndTracked.current) return;
      trackWithSeason({
        event_type: "dropoff_point",
        day_index: dayIndex,
        stage,
        payload: { reason: "visibility_hidden" },
      });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, dayIndex, stage]);

  useEffect(() => {
    if (!userId || loading) return;
    if (stage !== "microtask" || microTaskStartTracked.current) return;
    microTaskStartTracked.current = true;
    trackWithSeason({
      event_type: "microtask_start",
      day_index: dayIndex,
      stage: "microtask",
    });
  }, [stage, userId, dayIndex, loading]);

  useEffect(() => {
    if (!userId || loading) return;
    if (stage !== "fun_pulse" || funPulseShownTracked.current) return;
    funPulseShownTracked.current = true;
    trackWithSeason({ event_type: "fun_pulse_shown", day_index: dayIndex, stage });
  }, [stage, userId, dayIndex, loading]);

  useEffect(() => {
    if (!testerMode) return;
    const push = (key: string, message: ReturnType<typeof testerMessage>) => {
      try {
        if (localStorage.getItem(key) === "1") return;
        localStorage.setItem(key, "1");
        setTesterMessages((prev) => [...prev, message]);
      } catch {}
    };
    push(
      "mmv_tester_intro_seen",
      testerMessage("You’re testing an early systems slice of MMV.", {
        title: "Welcome to the MMV Playtest",
        details:
          "This game is about daily pressure and long-term drift, not optimization. Your choices today shape what’s possible tomorrow. • Posture changes allocation impact • Energy and stress carry forward • Resources enable or block story options • Start with the thread “The Phone on the Hall.”",
        tone: "warning",
      })
    );
  }, [testerMode]);

  const pushTesterMessage = useCallback(
    (key: string, message: ReturnType<typeof testerMessage>) => {
      if (!testerMode) return;
      try {
        if (localStorage.getItem(key) === "1") return;
        localStorage.setItem(key, "1");
        setTesterMessages((prev) => [...prev, message]);
      } catch {}
    },
    [testerMode]
  );

  const stagePrompt = useMemo(() => {
    if (!testerMode || !lastCompletedStage) return null;
    const prompts: Record<
      string,
      { id: string; body: string; options: string[] }
    > = {
      setup: {
        id: "setup_meaning",
        body: "Did the setup step feel meaningful?",
        options: ["Yes", "Neutral", "No"],
      },
      allocation: {
        id: "allocation_meaning",
        body: "Did time allocation feel meaningful?",
        options: ["Yes", "Neutral", "No"],
      },
      storylet_1: {
        id: "storylet_1_clarity",
        body: "Did you understand why that outcome happened?",
        options: ["Yes", "Mostly", "No"],
      },
      microtask: {
        id: "microtask_value",
        body: "Would you miss the micro interaction if it were gone?",
        options: ["Yes", "Maybe", "No"],
      },
      storylet_2: {
        id: "storylet_2_clarity",
        body: "Did the second storylet feel distinct?",
        options: ["Yes", "Neutral", "No"],
      },
      social: {
        id: "social_value",
        body: "Did the social step feel worth doing?",
        options: ["Yes", "Neutral", "No"],
      },
      reflection: {
        id: "reflection_value",
        body: "Did the reflection feel useful?",
        options: ["Yes", "Neutral", "No"],
      },
    };
    const prompt = prompts[lastCompletedStage];
    if (!prompt) return null;
    if (testerStageResponses[prompt.id]) return null;
    return { stage: lastCompletedStage, ...prompt };
  }, [testerMode, lastCompletedStage, testerStageResponses]);

  const handleStagePromptResponse = (response: string) => {
    if (!stagePrompt) return;
    setTesterStageResponses((prev) => ({
      ...prev,
      [stagePrompt.id]: response,
    }));
    trackWithSeason({
      event_type: "tester_stage_prompt",
      day_index: dayIndex,
      stage: stagePrompt.stage,
      payload: { question_id: stagePrompt.id, response },
    });
  };

  useEffect(() => {
    if (!dayState) return;
    const prev = previousDayStateRef.current;
    const source = pendingDeltaSourceRef.current;
    if (prev && source) {
      const parts: string[] = [];
      if (dayState.energy !== prev.energy) {
        parts.push(`Energy ${prev.energy}→${dayState.energy} (${source})`);
      }
      if (dayState.stress !== prev.stress) {
        parts.push(`Stress ${prev.stress}→${dayState.stress} (${source})`);
      }
      setTesterDeltaNote(parts.length ? parts.join(", ") : null);
    }
    previousDayStateRef.current = {
      energy: dayState.energy,
      stress: dayState.stress,
    };
    pendingDeltaSourceRef.current = null;
  }, [dayState?.energy, dayState?.stress]);

  useEffect(() => {
    if (!testerMode) return;
    if (!Number.isFinite(dayIndex)) return;
    if (dayIndex >= 3) {
      pushTesterMessage(
        "mmv_tester_day3_skills",
        testerMessage("Skill points unlock after Day 2.", {
          title: "Skills Reflect Consistency",
          details:
            "They are: • Conditional (energy & stress matter) • Progressive (each level costs more) • Subtle (small multipliers, not power spikes). Skills represent who you are over time, not tactical choices.",
          tone: "warning",
        })
      );
    }
    if (dayIndex >= 5) {
      pushTesterMessage(
        "mmv_tester_day5_drift",
        testerMessage("By now, patterns should be forming.", {
          title: "Look for Drift",
          details:
            "Ask yourself: • What kind of person is this character becoming? • Which pressures feel self‑inflicted? • Which tradeoffs surprised you? That sense of drift is the core of the game.",
          tone: "warning",
        })
      );
    }
  }, [dayIndex, testerMode, pushTesterMessage]);

  useEffect(() => {
    if (!testerMode || !relationshipDebugEnabled || !userId) return;
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("choice_log")
        .select("id,created_at,event_type,delta,meta")
        .eq("user_id", userId)
        .eq("event_type", "REL_DELTA")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("Failed to load relationship debug events", error);
        return;
      }
      if (!cancelled) {
        setRelDebugEvents(data ?? []);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [testerMode, relationshipDebugEnabled, userId]);

  useEffect(() => {
    return () => {
      if (!userId || sessionEndTracked.current) return;
      sessionEndTracked.current = true;
      trackWithSeason({
        event_type: "session_end",
        day_index: latestDayIndexRef.current ?? undefined,
        stage: latestStageRef.current ?? undefined,
        payload: { reason: "unmount" },
      });
    };
  }, [userId]);

  const totalAllocation = useMemo(
    () =>
      Object.values(allocation).reduce(
        (sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0),
        0
      ),
    [allocation]
  );

  const allocationValid = totalAllocation === 100;
  const choicesDisabled =
    savingChoice || consequenceActive || Boolean(pendingReactionText);
  const STUDY_TENSION_THRESHOLD = 40;
  const HEALTH_TENSION_THRESHOLD = 30;

  const handleAllocationChange = (key: keyof AllocationPayload, value: number) => {
    recordInteraction();
    setAllocation({ ...allocation, [key]: value });
  };

  const handleSaveAllocation = async () => {
    if (!userId || !allocationValid) return;
    recordInteraction();
    setSavingAllocation(true);
    setError(null);
    pendingDeltaSourceRef.current = "allocation";
    try {
      await saveTimeAllocation(userId, dayIndex, allocation, posture?.posture ?? null);
      pushTesterMessage(
        "mmv_tester_after_allocation",
        testerMessage("Time allocation sets pressure, not success.", {
          title: "Allocation ≠ Outcome",
          details:
            "Energy and stress are the key signals. Pay attention to how today’s choices affect tomorrow’s baseline. Try repeating the same allocation under a different posture.",
          tone: "warning",
        })
      );
      if (USE_DAILY_LOOP_ORCHESTRATOR) {
        const refreshed = await getOrCreateDailyRun(userId, new Date(), {
          microtaskVariant,
          experiments,
          isAdmin: devIsAdmin,
        });
        setDayState(refreshed.dayState ?? null);
      } else {
        const ds = await fetchDailyState(userId);
        if (ds) {
          setDailyState({ ...ds, day_index: dayIndex });
          setDayState({
            energy: ds.energy,
            stress: ds.stress,
            cashOnHand: 0,
            knowledge: 0,
            socialLeverage: 0,
            physicalResilience: 50,
            total_study: 0,
            total_work: 0,
            total_social: 0,
            total_health: 0,
            total_fun: 0,
          });
        }
      }
      const todayTensions = await fetchTensions(userId, dayIndex);
      const unresolved = todayTensions.filter((tension) => !tension.resolved_at);
      if (
        allocation.study >= STUDY_TENSION_THRESHOLD &&
        unresolved.some((tension) => tension.key === "unfinished_assignment")
      ) {
        await resolveTension(userId, dayIndex, "unfinished_assignment");
      }
      if (
        allocation.health >= HEALTH_TENSION_THRESHOLD &&
        unresolved.some((tension) => tension.key === "fatigue")
      ) {
        await resolveTension(userId, dayIndex, "fatigue");
      }
      setAllocationSaved(true);
      setAllocationSummary(allocation);
      if (USE_DAILY_LOOP_ORCHESTRATOR) {
        setStage("storylet_1");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to save allocation.");
    } finally {
      setSavingAllocation(false);
    }
  };

  const renderDeltaLines = useCallback(
    (label: string, delta?: Record<string, number>) => {
      if (!delta) return null;
      const entries = Object.entries(delta).filter(
        ([, value]) => typeof value === "number" && value !== 0
      );
      if (entries.length === 0) return null;
      return (
        <div className="text-xs text-slate-600">
          {label}{" "}
          {entries.map(([key, value]) => {
            const mapped = mapLegacyResourceKey(key) ?? key;
            return (
              <span key={key} className="mr-2">
                {resourceLabel(mapped as any)} {value >= 0 ? "+" : ""}
                {value}
              </span>
            );
          })}
        </div>
      );
    },
    []
  );

  const currentStorylet =
    stage === "storylet_1"
      ? storylets[0]
      : stage === "storylet_2"
      ? storylets[1]
      : stage === "storylet_3"
      ? storylets[2]
      : storylets[currentIndex];
  const choiceLabelMap = useMemo(() => {
    if (!currentStorylet) return new Map<string, string>();
    return new Map(toChoices(currentStorylet).map((choice) => [choice.id, choice.label]));
  }, [currentStorylet]);

  useEffect(() => {
    setSelectedChoiceId(null);
    setPendingReactionText(null);
    setPendingAdvanceTarget(null);
  }, [currentStorylet?.id]);

  const handleChoice = async (choiceId: string) => {
    if (!userId || !currentStorylet) return;
    if (pendingReactionText) return;
    recordInteraction();
    const selectedChoice = toChoices(currentStorylet).find(
      (choice) => choice.id === choiceId
    );
    setSelectedChoiceId(choiceId);
    setPendingAdvanceTarget(selectedChoice?.targetStoryletId ?? null);
    const derivedNpcMemory = Object.fromEntries(
      Object.entries(relationshipsState).map(([npcId, entry]) => {
        const record = entry as Record<string, unknown>;
        return [
          npcId,
          {
            met: record.met === true,
            knows_name: record.knows_name === true,
            knows_face: record.knows_face === true,
          },
        ];
      })
    );
    const reactionConditions = selectedChoice?.reaction_text_conditions ?? [];
    let resolvedReactionText =
      typeof selectedChoice?.reaction_text === "string"
        ? selectedChoice.reaction_text.trim()
        : null;
    let matchedCondition: (typeof reactionConditions)[number] | null = null;
    for (const condition of reactionConditions) {
      if (matchesRequirement(condition.if, { npc_memory: derivedNpcMemory })) {
        resolvedReactionText = condition.text;
        matchedCondition = condition;
        break;
      }
    }
    if (!firstChoiceTrackedRef.current && sessionStartAtRef.current) {
      firstChoiceTrackedRef.current = true;
      trackWithSeason({
        event_type: "first_choice_time",
        day_index: dayIndex,
        stage,
        payload: {
          ms_since_session_start: Date.now() - sessionStartAtRef.current,
        },
      });
    }
    setSavingChoice(true);
    setError(null);
    setOutcomeMessage(null);
    setOutcomeDeltas(null);
    setLastCheck(null);
    setCompareVisible(false);
    setCompareSnapshot(null);
    setCompareError(null);
    setCompareChoiceId(null);
    setCompareNote("");
    try {
      const runId = await createStoryletRun(
        userId,
        currentStorylet.id,
        dayIndex,
        choiceId
      );
      trackWithSeason({
        event_type: "storylet_choice",
        day_index: dayIndex,
        stage,
        payload: { storylet_id: currentStorylet.id, choice_id: choiceId },
      });

      const alreadyRecorded = Boolean(runId);
      let beatFallbackMessage: string | null = null;
      if (!alreadyRecorded) {
        let state = dailyState;
        if (!state) {
          state = await fetchDailyState(userId);
        }
        if (!state) {
          throw new Error("Unable to load daily state for outcome application.");
        }

        const {
          nextDailyState,
          appliedDeltas,
          appliedMessage,
          resolvedOutcomeId,
          resolvedOutcomeAnomalies,
          lastCheck: resolvedCheck,
        } =
          await applyOutcomeForChoice(
            state,
            choiceId,
            currentStorylet,
            userId,
            dayIndex,
            {
              dayState,
              posture: posture?.posture ?? null,
              skills: featureFlags.skills ? skills ?? undefined : undefined,
    }
  );

        setDailyState(nextDailyState);
        if (
          dayState &&
          (typeof appliedDeltas.energy === "number" ||
            typeof appliedDeltas.stress === "number")
        ) {
          const nextEnergy =
            typeof appliedDeltas.energy === "number"
              ? Math.max(0, Math.min(100, dayState.energy + appliedDeltas.energy))
              : dayState.energy;
          const nextStress =
            typeof appliedDeltas.stress === "number"
              ? Math.max(0, Math.min(100, dayState.stress + appliedDeltas.stress))
              : dayState.stress;
          setDayState({ ...dayState, energy: nextEnergy, stress: nextStress });
        }
        const hasVectorDeltas =
          appliedDeltas.vectors &&
          Object.keys(appliedDeltas.vectors).length > 0;
        const hasDeltas =
          typeof appliedDeltas.energy === "number" ||
          typeof appliedDeltas.stress === "number" ||
          hasVectorDeltas;
        beatFallbackMessage = appliedMessage ?? null;
        setOutcomeMessage(
          appliedMessage || (hasDeltas ? "Choice recorded." : null)
        );
        setOutcomeDeltas(hasDeltas ? appliedDeltas : null);
        if (resolvedCheck) {
          setLastCheck(resolvedCheck);
          pushTesterMessage(
            "mmv_tester_first_check",
            testerMessage("Some results depend on your current state:", {
              title: "Outcomes Are State-Driven",
              details:
                "• Skills • Energy & stress • Posture. Success isn’t guaranteed — but it isn’t random either. Ask whether the outcome makes sense given how you’ve been playing.",
              tone: "warning",
            })
          );
        }
        if (resolvedOutcomeAnomalies?.length) {
          await awardAnomalies({
            userId,
            anomalyIds: resolvedOutcomeAnomalies,
            dayIndex,
            source: currentStorylet.slug ?? currentStorylet.id,
          });
          resolvedOutcomeAnomalies.forEach((anomalyId) => {
            trackWithSeason({
              event_type: "anomaly_discovered",
              day_index: dayIndex,
              stage,
              payload: { anomaly_id: anomalyId, source: currentStorylet.slug },
            });
          });
        }
        if (resolvedOutcomeId) {
          trackWithSeason({
            event_type: "storylet_resolved_outcome",
            day_index: dayIndex,
            stage,
            payload: {
              storylet_id: currentStorylet.id,
              choice_id: choiceId,
              outcome_id: resolvedOutcomeId,
            },
          });
        }
        trackWithSeason({
          event_type: "storylet_complete",
          day_index: dayIndex,
          stage,
          payload: {
            storylet_id: currentStorylet.id,
            choice_id: choiceId,
          },
        });

        if (
          featureFlags.afterActionCompareEnabled &&
          cohortId &&
          (currentStorylet.tags ?? []).includes("compare")
        ) {
          setCompareLoading(true);
          try {
            const snapshot = await fetchCompareSnapshot({
              cohortId,
              storyletId: currentStorylet.id,
              choiceIds: toChoices(currentStorylet).map((c) => c.id),
            });
            setCompareSnapshot(snapshot);
            setCompareVisible(true);
            setCompareChoiceId(choiceId);
            trackWithSeason({
              event_type: "compare_view_opened",
              day_index: dayIndex,
              stage,
              payload: { storylet_id: currentStorylet.id },
            });
          } catch (compareErr) {
            console.error(compareErr);
            setCompareError("Not enough data yet.");
            setCompareVisible(true);
          } finally {
            setCompareLoading(false);
          }
        }
        if (process.env.NODE_ENV !== "production") {
          console.debug("[choice-outcome]", {
            storyletId: currentStorylet.id,
            choiceId,
            appliedDeltas,
          });
        }

        setRuns((prev) => [
          ...prev,
          {
            id: runId ?? `${currentStorylet.id}-${choiceId}-${Date.now()}`,
            user_id: userId,
            storylet_id: currentStorylet.id,
            day_index: dayIndex,
            choice_id: choiceId,
          },
        ]);
      } else {
        setOutcomeMessage("Choice already recorded.");
        setRuns((prev) => {
          const exists = prev.some(
            (r) =>
              r.storylet_id === currentStorylet.id && r.day_index === dayIndex
          );
          return exists
            ? prev
            : [
                ...prev,
                {
                  id: runId ?? `${currentStorylet.id}-${choiceId}-existing`,
                  user_id: userId,
                  storylet_id: currentStorylet.id,
                  day_index: dayIndex,
                  choice_id: choiceId,
                },
              ];
        });
      }

      const reactionText =
        typeof resolvedReactionText === "string" &&
        resolvedReactionText.trim().length > 0
          ? resolvedReactionText.trim()
          : null;
      const beatText =
        reactionText ??
        (beatBufferEnabled && beatFallbackMessage ? beatFallbackMessage : null);
      if (beatBufferEnabled && beatText) {
        setPendingReactionText(beatText);
        supabase.from("choice_log").insert({
          user_id: userId,
          day: dayIndex,
          event_type: "BEAT_SHOWN",
          arc_id: null,
          arc_instance_id: null,
          step_key: null,
          option_key: choiceId,
          delta: null,
          meta: {
            storylet_id: currentStorylet.id,
            choice_id: choiceId,
            text: beatText,
          },
        });
      }

      if (USE_DAILY_LOOP_ORCHESTRATOR) {
        let nextStage: DailyRunStage;
        if (stage === "storylet_1") {
          nextStage = "storylet_2";
        } else if (stage === "storylet_2") {
          nextStage = "storylet_3";
        } else {
          nextStage =
            microTaskEligible && microTaskStatus === "pending"
              ? "microtask"
              : hasSentBoost
              ? "reflection"
              : "social";
        }
        pendingTransitionRef.current = () => setStage(nextStage);
        if (!reactionText || !beatBufferEnabled) {
          setConsequenceActive(true);
        }
      } else {
        pendingTransitionRef.current = () => setCurrentIndex((i) => i + 1);
        if (!reactionText || !beatBufferEnabled) {
          setConsequenceActive(true);
        }
      }
      if (reactionText && !beatBufferEnabled) {
        const next = pendingTransitionRef.current;
        pendingTransitionRef.current = null;
        if (next) next();
      }

      const relationshipEvents = [
        ...(selectedChoice?.events_emitted ?? []),
        ...mapLegacyRelationalEffects(selectedChoice?.relational_effects),
        ...mapLegacyNpcKnowledge(selectedChoice?.set_npc_memory),
        ...mapLegacyRelationalEffects(matchedCondition?.relational_effects),
        ...mapLegacyNpcKnowledge(matchedCondition?.set_npc_memory),
      ];
      if (relationshipEvents.length > 0) {
        const { next: nextRelationships, logs } = applyRelationshipEvents(
          relationshipsState,
          relationshipEvents,
          { storylet_slug: currentStorylet.slug, choice_id: choiceId }
        );
        await updateRelationships(userId, nextRelationships, dayIndex);
        if (dailyState) {
          setDailyState({ ...dailyState, relationships: nextRelationships });
        }
        const summary = logs.map((entry) => {
          const parts: string[] = [];
          if (typeof entry.delta.relationship === "number") {
            const prefix = entry.delta.relationship > 0 ? "+" : "";
            parts.push(`relationship ${prefix}${entry.delta.relationship}`);
          }
          if (typeof entry.delta.knows_name === "boolean") {
            parts.push(`knows name ${entry.delta.knows_name ? "✓" : "✗"}`);
          }
          if (typeof entry.delta.met === "boolean") {
            parts.push(`met ${entry.delta.met ? "✓" : "✗"}`);
          }
          if (typeof entry.delta.knows_face === "boolean") {
            parts.push(`knows face ${entry.delta.knows_face ? "✓" : "✗"}`);
          }
          return `${npcNameForId(entry.npc_id)}: ${parts.join(", ")}`;
        });
        setLastRelSummary(summary);
        logs.forEach((entry) => {
          const flagChanged =
            typeof entry.delta.met === "boolean" ||
            typeof entry.delta.knows_name === "boolean" ||
            typeof entry.delta.knows_face === "boolean";
          const payload = {
            user_id: userId,
            day: dayIndex,
            event_type: "REL_DELTA",
            arc_id: null,
            arc_instance_id: null,
            step_key: null,
            option_key: choiceId,
            delta: entry.delta,
            meta: {
              storylet_slug: entry.source.storylet_slug,
              choice_id: entry.source.choice_id,
              npc_id: entry.npc_id,
              kind: flagChanged ? "npc_memory" : "relational",
              before: entry.before,
              after: entry.after,
            },
          };
          supabase.from("choice_log").insert(payload);
          if (testerMode && relationshipDebugEnabled) {
            setRelDebugEvents((prev) => [payload as any, ...prev].slice(0, 50));
          }
        });
      }
    } catch (e) {
      console.error(e);
      setError("Failed to record choice.");
    } finally {
      setSavingChoice(false);
    }
  };

  const handleReactionContinue = () => {
    setPendingReactionText(null);
    setPendingAdvanceTarget(null);
    setSelectedChoiceId(null);
    setLastRelSummary([]);
    const next = pendingTransitionRef.current;
    pendingTransitionRef.current = null;
    if (next) next();
  };

  useEffect(() => {
    if (!beatBufferEnabled || !pendingReactionText) return;
    if (!BEAT_AUTO_ADVANCE_MS) return;
    const timer = window.setTimeout(
      () => handleReactionContinue(),
      BEAT_AUTO_ADVANCE_MS
    );
    return () => window.clearTimeout(timer);
  }, [beatBufferEnabled, pendingReactionText]);

  useEffect(() => {
    if (!beatBufferEnabled || !pendingReactionText) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleReactionContinue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [beatBufferEnabled, pendingReactionText]);

  const handleCompareDismiss = () => {
    setCompareVisible(false);
    if (!currentStorylet) return;
    trackWithSeason({
      event_type: "compare_view_dismissed",
      day_index: dayIndex,
      stage,
      payload: { storylet_id: currentStorylet.id },
    });
  };

  const handleCompareSubmit = async () => {
    if (!compareChoiceId || !currentStorylet || !cohortId || !userId) return;
    setCompareSending(true);
    const res = await submitRationale({
      cohortId,
      userId,
      storyletId: currentStorylet.id,
      choiceId: compareChoiceId,
      body: compareNote,
    });
    if (!res.ok) {
      setCompareError(res.error ?? "Unable to save note.");
      setCompareSending(false);
      return;
    }
    setCompareNote("");
    const snapshot = await fetchCompareSnapshot({
      cohortId,
      storyletId: currentStorylet.id,
      choiceIds: toChoices(currentStorylet).map((c) => c.id),
    });
    setCompareSnapshot(snapshot);
    setCompareSending(false);
  };

  const handleSelectRemnant = async (key: RemnantKey) => {
    if (!userId) return;
    const ok = await selectRemnant(userId, key);
    if (!ok) return;
    const def = remnantDefinitions.find((rem) => rem.key === key) ?? null;
    setRemnantState((prev) => ({
      unlocked: prev?.unlocked ?? [],
      active: def,
      applied: prev?.applied ?? false,
    }));
    trackWithSeason({
      event_type: "remnant_selected",
      day_index: dayIndex,
      payload: { remnant_key: key },
    });
  };

  const handleRunReset = async () => {
    setRunResetting(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("No session found.");
        return;
      }
      trackWithSeason({ event_type: "next_run_cta_clicked", day_index: dayIndex });
      const res = await fetch("/api/run/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to reset run.");
      }
      trackWithSeason({ event_type: "run_reset_completed", day_index: dayIndex });
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to reset run.");
    } finally {
      setRunResetting(false);
    }
  };

  const handleArcOneReplayIntention = async (intention: string) => {
    setArcOneReflectionSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("No session found.");
        return;
      }
      const res = await fetch("/api/arc-one/replay-intention", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intention }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save intention.");
      }
      await handleRunReset();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save intention.");
    } finally {
      setArcOneReflectionSaving(false);
    }
  };

  const loadSocialData = async (uid: string, day: number) => {
    setLoadingSocial(true);
    const [profiles, received, sent] = await Promise.all([
      fetchPublicProfiles(uid),
      fetchTodayReceivedBoosts(uid, day),
      hasSentBoostToday(uid, day),
    ]);
    setPublicProfiles(profiles);
    setSelectedRecipient((prev) => prev || profiles[0]?.user_id || "");
    setBoostsReceived(received);
    setHasSentBoost(sent);
    setLoadingSocial(false);
  };

  const handleSendBoost = async () => {
    if (!userId || !selectedRecipient) return;
    recordInteraction();
    setError(null);
    setBoostMessage(null);
    setLoadingSocial(true);
    try {
      await sendBoost(userId, selectedRecipient, dayIndex);
      appendGroupFeedEvent(userId, "boost_sent", { to_user_id: selectedRecipient }).catch(
        () => {}
      );
      incrementGroupObjective(1, "boost_sent").catch(() => {});
      await loadSocialData(userId, dayIndex);
      setHasSentBoost(true);
      setBoostMessage(
        "You feel more connected. Someone else feels supported."
      );
      const refreshed = await fetchDailyState(userId);
      if (refreshed) {
        setDailyState(refreshed);
        setOutcomeDeltas({
          vectors: { social: 1 },
        });
      }
      if (USE_DAILY_LOOP_ORCHESTRATOR) {
        setStage("reflection");
      }
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : "Failed to send boost. Try again.";
      setError(message);
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleMicroTaskComplete = async (result: {
    score: number;
    duration_ms: number;
  }) => {
    if (!userId) return;
    if (microTaskSaving) return;
    setError(null);
    setMicroTaskSaving(true);
    try {
      const outcome = await completeMicroTask(
        userId,
        dayIndex,
        result.score,
        result.duration_ms
      );
      if (!outcome.alreadyRecorded) {
        if (outcome.nextDailyState) {
          setDailyState(outcome.nextDailyState);
        }
        setOutcomeDeltas(outcome.appliedDeltas ?? null);
      }
      setMicroTaskStatus("done");
      trackWithSeason({
        event_type: "microtask_complete",
        day_index: dayIndex,
        stage: "microtask",
        payload: { score: result.score, duration_ms: result.duration_ms },
      });
      setStage(hasSentBoost ? "reflection" : "social");
    } catch (e) {
      console.error(e);
      setError("Failed to save micro-task.");
    } finally {
      setMicroTaskSaving(false);
    }
  };

  const handleMicroTaskSkip = async () => {
    if (!userId) return;
    if (microTaskSaving) return;
    setError(null);
    setMicroTaskSaving(true);
    try {
      await skipMicroTask(userId, dayIndex);
      setMicroTaskStatus("skipped");
      trackWithSeason({
        event_type: "microtask_skip",
        day_index: dayIndex,
        stage: "microtask",
      });
      setStage(hasSentBoost ? "reflection" : "social");
    } catch (e) {
      console.error(e);
      setError("Failed to skip micro-task.");
    } finally {
      setMicroTaskSaving(false);
    }
  };

  const handleAllocateSkillPoint = async (skillKey: string) => {
    if (!userId) return;
    setError(null);
    setSetupActionError(null);
    setAllocatingSkill(true);
    try {
      await allocateSkillPoint({ userId, skillKey });
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setSetupActionError(
        e instanceof Error ? e.message : "Failed to allocate skill point."
      );
    } finally {
      setAllocatingSkill(false);
    }
  };

  const handleSubmitPosture = async (postureValue: DailyPosture["posture"]) => {
    if (!userId) return;
    setError(null);
    setSetupActionError(null);
    setSubmittingPosture(true);
    try {
      await submitPosture({ userId, dayIndex, posture: postureValue });
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setSetupActionError(e instanceof Error ? e.message : "Failed to set posture.");
    } finally {
      setSubmittingPosture(false);
    }
  };

  const handleContributeInitiative = async (initiativeId: string) => {
    if (!userId) return;
    recordInteraction();
    setInitiativeSubmitting(true);
    setError(null);
    try {
      await contributeToInitiative(initiativeId, userId, dayIndex, 1, cohortId);
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to contribute.");
    } finally {
      setInitiativeSubmitting(false);
    }
  };

  const handleReflection = async (response: ReflectionResponse | "skip") => {
    if (!userId) return;
    recordInteraction();
    setError(null);
    setReflectionSaving(true);
    try {
      if (response === "skip") {
        await upsertReflection(userId, dayIndex, { skipped: true, response: null });
        trackWithSeason({
          event_type: "reflection_skip",
          day_index: dayIndex,
          stage: "reflection",
        });
      } else {
        await upsertReflection(userId, dayIndex, {
          response,
          skipped: false,
        });
      }
      if (funPulseEligible && !funPulseDone) {
        setStage("fun_pulse");
      } else {
        setStage("complete");
      }
      setBoostMessage("Thanks — see you tomorrow.");
    } catch (e) {
      console.error(e);
      setError("Failed to save reflection.");
    } finally {
      setReflectionSaving(false);
    }
  };

  const handleFunPulseSelect = async (rating: number) => {
    if (!userId || !seasonContext) return;
    if (funPulseSaving) return;
    setError(null);
    setFunPulseSaving(true);
    try {
      await upsertFunPulse({
        userId,
        seasonIndex: seasonContext.currentSeason.season_index,
        dayIndex,
        rating,
        skipped: false,
      });
      setFunPulseDone(true);
      trackWithSeason({
        event_type: "fun_pulse_answered",
        day_index: dayIndex,
        stage: "fun_pulse",
        payload: { rating },
      });
      setStage("complete");
    } catch (e) {
      console.error(e);
      setError("Failed to save fun pulse.");
    } finally {
      setFunPulseSaving(false);
    }
  };

  const handleFunPulseSkip = async () => {
    if (!userId || !seasonContext) return;
    if (funPulseSaving) return;
    setError(null);
    setFunPulseSaving(true);
    try {
      await upsertFunPulse({
        userId,
        seasonIndex: seasonContext.currentSeason.season_index,
        dayIndex,
        skipped: true,
      });
      setFunPulseDone(true);
      trackWithSeason({
        event_type: "fun_pulse_skipped",
        day_index: dayIndex,
        stage: "fun_pulse",
      });
      setStage("complete");
    } catch (e) {
      console.error(e);
      setError("Failed to save fun pulse.");
    } finally {
      setFunPulseSaving(false);
    }
  };

  useEffect(() => {
    const markCompleteIfNeeded = async () => {
      if (!userId) return;
      if (stage !== "complete") return;
      if (alreadyCompletedToday) return;
      try {
        await markDailyComplete(userId, dayIndex);
        incrementGroupObjective(2, "daily_complete").catch(() => {});
        setAlreadyCompletedToday(true);
      } catch (e) {
        console.error("Failed to mark daily complete", e);
      }
    };
    if (USE_DAILY_LOOP_ORCHESTRATOR) {
      markCompleteIfNeeded();
    }
  }, [stage, alreadyCompletedToday, userId, dayIndex]);

  return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Play</h1>
              <p className="text-slate-700">
                Day {dayIndex} · Energy{" "}
                {dayState?.energy ?? dailyState?.energy ?? "—"} · Stress{" "}
                {dayState?.stress ?? dailyState?.stress ?? "—"}
              </p>
              <div className="mt-2 text-sm text-slate-600">
                <p className="font-medium text-slate-700">
                  {getDailyStageCopy(stage).title}
                </p>
                <p>{getDailyStageCopy(stage).body}</p>
              </div>
              {seasonContext ? (
                <div className="mt-2">
                  <SeasonBadge
                    seasonIndex={seasonContext.currentSeason.season_index}
                    daysRemaining={seasonContext.daysRemaining}
                  />
                </div>
              ) : null}
              <p className="text-slate-600 text-sm">
                Signed in as {session.user.email ?? "unknown user"}.
              </p>
              <div className="mt-3 space-y-2">
                <TesterOnly>
                  <MessageCard message={testerNote} variant="inline" />
                </TesterOnly>
                {testerMode && slicePhaseLabel ? (
                  <TesterOnly>
                    <p className="text-xs text-slate-500">
                      Phase: {slicePhaseLabel}
                    </p>
                  </TesterOnly>
                ) : null}
                {testerMode &&
                featureFlags.rookieCircleEnabled &&
                cohortId ? (
                  <TesterOnly>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p>
                        Rookie Circle: {cohortId}
                        {cohortRoster
                          ? ` · ${cohortRoster.count} members`
                          : ""}
                      </p>
                      {cohortRoster?.handles?.length ? (
                        <p className="mt-1">
                          Handles: {cohortRoster.handles.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </TesterOnly>
                ) : null}
                {testerMessages.length > 0 ? (
                  <TesterOnly>
                    <div className="space-y-2">
                      {testerMessages.map((message) => (
                        <MessageCard key={message.id} message={message} variant="inline" />
                      ))}
                    </div>
                  </TesterOnly>
                ) : null}
                {testerDeltaMessage ? (
                  <TesterOnly>
                    <MessageCard message={testerDeltaMessage} variant="inline" />
                  </TesterOnly>
                ) : null}
                {testerMode && testerEventLog.length > 0 ? (
                  <TesterOnly>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">
                        Recent events
                      </p>
                      <ul className="mt-1 space-y-1">
                        {testerEventLog.slice(0, 8).map((event, idx) => (
                          <li key={`${event.event_type}-${event.ts}-${idx}`}>
                            {event.event_type}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TesterOnly>
                ) : null}
                {testerMode && relationshipDebugEnabled ? (
                  <TesterOnly>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-700">
                          Relationship deltas
                        </p>
                        <div className="flex items-center gap-1">
                          {(["all", "relational", "flags"] as const).map(
                            (filter) => (
                              <Button
                                key={filter}
                                variant={relDebugFilter === filter ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setRelDebugFilter(filter)}
                              >
                                {filter === "all"
                                  ? "All"
                                  : filter === "relational"
                                  ? "Relationship"
                                  : "Flags"}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                      <div className="mt-2 max-h-48 space-y-2 overflow-auto">
                        {filteredRelEvents.length === 0 ? (
                          <p className="text-slate-500">No deltas yet.</p>
                        ) : (
                          filteredRelEvents.map((event, idx) => {
                            const meta = (event.meta ?? {}) as Record<string, any>;
                            const npcId = meta.npc_id ?? "unknown";
                            return (
                              <div
                                key={`${event.created_at ?? "event"}-${idx}`}
                                className="rounded border border-slate-200 bg-white px-2 py-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-slate-700">
                                    {npcId}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {event.created_at
                                      ? new Date(event.created_at).toLocaleTimeString()
                                      : ""}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {meta.storylet_slug ?? "storylet"} ·{" "}
                                  {meta.choice_id ?? "choice"}
                                </div>
                                <div className="mt-1 font-mono text-[11px] text-slate-700">
                                  {formatRelDelta(event.delta as Record<string, unknown>)}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </TesterOnly>
                ) : null}
                {testerMode && arcOneState ? (
                  <TesterOnly>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">People</p>
                      <div className="mt-2 space-y-2">
                        {["npc_roommate_dana", "npc_connector_miguel"].map(
                          (npcId) => {
                            const entry = relationshipsState[npcId] ?? {};
                            const met = entry.met ? "✅" : "❌";
                            const known = entry.knows_name ? "✅" : "❌";
                            return (
                              <div
                                key={npcId}
                                className="rounded border border-slate-200 bg-white px-2 py-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-slate-700">
                                    {npcId === "npc_roommate_dana"
                                      ? "Dana"
                                      : "Miguel"}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    met {met} · name {known}
                                  </span>
                                </div>
                                <div className="mt-1 font-mono text-[11px] text-slate-700">
                                  {formatRelDelta(entry as Record<string, unknown>)}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </TesterOnly>
                ) : null}
              </div>
              {dayRolloverNotice ? (
                <p className="mt-2 text-xs text-slate-500">{dayRolloverNotice}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {isEmailAllowed(session.user.email) || devIsAdmin ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const next = !showDevMenu;
                    setShowDevMenu(next);
                    if (next) {
                      loadDevCharacters();
                      if (bootstrapUserId) {
                        loadDevSettings(bootstrapUserId);
                      }
                    }
                  }}
                >
                  Dev menu
                </Button>
              ) : null}
            </div>
          </div>

          {showDevMenu ? (
            <DevMenu
              isAdmin={Boolean(
                (session?.user?.email &&
                  isEmailAllowed(session.user.email)) ||
                  devIsAdmin ||
                  bootstrapIsAdmin
              )}
              currentUserId={bootstrapUserId}
              devSettings={devSettings}
              devSettingsLoading={devSettingsLoading}
              devSettingsSaving={devSettingsSaving}
              runResetting={runResetting}
              devLoading={devLoading}
              devError={devError}
              devCharacters={devCharacters}
              advancingUserId={advancingUserId}
              resettingUserId={resettingUserId}
              togglingAdminId={togglingAdminId}
              onToggleTestMode={handleToggleTestMode}
              onFastForward={handleFastForward}
              onResetRun={handleRunReset}
              onClose={() => setShowDevMenu(false)}
              onAdvanceDay={handleAdvanceDay}
              onResetAccount={handleResetAccount}
              onToggleAdmin={handleToggleAdmin}
              onFlagsChanged={() => setFeatureFlagsVersion((v) => v + 1)}
              relationshipDebugEnabled={relationshipDebugEnabled}
              relDebugEvents={relDebugEvents}
              npcMemory={relationshipsState ?? null}
            />
          ) : null}

          {seasonResetPending ? (
            <section className="rounded-md border border-slate-500/40 border-l-4 border-l-slate-300/70 bg-indigo-950 px-4 py-4 space-y-3 text-slate-100">
              <h2 className="text-xl font-semibold tracking-wide">
                Season {seasonIndex ?? "?"} begins
              </h2>
              <p className="text-slate-200">
                You remember: anomalies and theories.
              </p>
              <TesterOnly>
                <div className="mt-2">
                  <MessageCard message={seasonResetTesterNote} variant="inline" />
                </div>
              </TesterOnly>
              <div className="mt-2">
                <MessageCard message={seasonResetGameNote} variant="inline" />
              </div>
              {seasonRecap ? (
                <div className="rounded-md border border-slate-500/40 bg-slate-900/40 px-3 py-3 text-sm text-slate-200 space-y-1">
                  <p>Last season recap:</p>
                  <p>· Anomalies found: {seasonRecap.anomaliesFoundCount}</p>
                  <p>· Hypotheses written: {seasonRecap.hypothesesCount}</p>
                  {seasonRecap.topVector ? (
                    <p>· Strongest vector: {seasonRecap.topVector}</p>
                  ) : null}
                </div>
              ) : null}
              <Button
                className="bg-slate-100 text-slate-900 hover:bg-white"
                onClick={() => {
                  setSeasonResetPending(false);
                  const lastSeason =
                    seasonRecap?.lastSeasonIndex ??
                    (seasonIndex ? seasonIndex - 1 : null);
                  const query = lastSeason ? `?season=${lastSeason}` : "";
                  router.push(`/season-recap${query}`);
                }}
              >
                Start the new season
              </Button>
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {loading ? (
                  <PlaySkeleton />
                ) : showDailyComplete ? (
                  <>
                    <section className="space-y-3 rounded-md border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100/60 px-4 py-4">
                      <h2 className="text-xl font-semibold text-slate-700">
                        Daily complete ✅
                      </h2>
                      <p className="text-slate-600">Come back tomorrow.</p>
                      {devSettings.test_mode ? (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            onClick={handleFastForward}
                            className="border-amber-300 text-amber-900 hover:bg-amber-100/70"
                          >
                            ⏩ Fast Forward: Next Day (TEST MODE)
                          </Button>
                          <TesterOnly>
                            <div className="mt-2">
                              <MessageCard
                                message={testerFastForwardNote}
                                variant="inline"
                              />
                            </div>
                          </TesterOnly>
                        </div>
                      ) : null}
                    </section>

                    <section className="space-y-3">
                      <h2 className="text-xl font-semibold">Boosts Received Today</h2>
                      {boostsReceived.length === 0 ? (
                        <p className="text-sm text-slate-700">
                          None yet. Maybe tomorrow.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {boostsReceived.map((boost, idx) => {
                            const sender =
                              publicProfiles.find(
                                (p) => p.user_id === boost.from_user_id
                              )?.display_name ?? "Unknown player";
                            return (
                              <li
                                key={`${boost.from_user_id}-${idx}`}
                                className="rounded border border-slate-200 bg-white px-3 py-2 text-slate-800"
                              >
                                {sender} sent you a boost.
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  </>
                ) : (
                  <>
                  {stagePrompt ? (
                    <TesterOnly>
                      <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                        <p className="text-sm text-amber-900">
                          {stagePrompt.body}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {stagePrompt.options.map((option) => (
                            <Button
                              key={option}
                              variant="outline"
                              onClick={() => handleStagePromptResponse(option)}
                              className="border-amber-300 text-amber-900 hover:bg-amber-100"
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      </section>
                    </TesterOnly>
                  ) : null}

                  {(stage === "social" ||
                    (!USE_DAILY_LOOP_ORCHESTRATOR &&
                      allocationSaved &&
                      !currentStorylet)) && initiatives.length > 0 ? (
                    <section className="space-y-3">
                      <InitiativePanel
                        initiative={initiatives[0]}
                        dayIndex={dayIndex}
                        directive={directive}
                        factions={factions}
                        submitting={initiativeSubmitting}
                        onContribute={() => handleContributeInitiative(initiatives[0].id)}
                      />
                    </section>
                  ) : null}

                  {USE_DAILY_LOOP_ORCHESTRATOR && stage === "setup" && (
                    <section className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                      <DailySetupPanel
                        tensions={tensions}
                        skillBank={skillBank}
                        posture={posture}
                        dayIndex={dayIndex}
                        allocations={skillAllocations}
                        skills={skills ?? undefined}
                        skillsEnabled={skillUiEnabled}
                        scarcityMode={arcOneMode}
                        onAllocateSkillPoint={handleAllocateSkillPoint}
                        submitting={allocatingSkill}
                        onSubmitPosture={handleSubmitPosture}
                        submittingPosture={submittingPosture}
                        actionError={setupActionError}
                      />
                    </section>
                  )}

                  {(stage === "allocation" ||
                    (!USE_DAILY_LOOP_ORCHESTRATOR && !allocationSaved)) && (
                    <AllocationSection
                      allocation={allocation}
                      totalAllocation={totalAllocation}
                      allocationValid={allocationValid}
                      savingAllocation={savingAllocation}
                      onAllocationChange={handleAllocationChange}
                      onSave={handleSaveAllocation}
                    />
                  )}

                  {(stage === "storylet_1" ||
                    stage === "storylet_2" ||
                    stage === "storylet_3" ||
                    (!USE_DAILY_LOOP_ORCHESTRATOR && allocationSaved)) && (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">Storylets</h2>
                          <span className="text-sm text-slate-600">
                            Progress: {Math.min(runs.length, 3)}/3
                          </span>
                        </div>
                        <p className="text-base text-slate-700">
                          Pick one choice. You can do three today.
                        </p>

                        {!currentStorylet ? (
                          <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                            {storylets.length === 0 ? (
                              <p className="text-slate-700">No more storylets today.</p>
                            ) : (
                              <p className="text-slate-700">Daily complete ✅</p>
                            )}
                            <Button className="mt-3" variant="secondary">
                              Back tomorrow
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                            <div>
                              <p className="text-sm text-slate-600">
                                Storylet{" "}
                                {stage === "storylet_3"
                                  ? 3
                                  : stage === "storylet_2"
                                  ? 2
                                  : 1}{" "}
                                of 3
                              </p>
                              <h3 className="text-lg font-semibold text-slate-900">
                                {currentStorylet.title}
                              </h3>
                              <p className="text-slate-700">{currentStorylet.body}</p>
                            </div>
                            <div className="space-y-2">
                              {(() => {
                                const choices = toChoices(currentStorylet);

                                return choices.length > 0 ? (
                                  choices.map((choice) => (
                                    <Button
                                      key={choice.id}
                                      variant="secondary"
                                      disabled={choicesDisabled}
                                      onClick={() => handleChoice(choice.id)}
                                      className="w-full justify-start"
                                    >
                                      {choice.label}
                                    </Button>
                                  ))
                                ) : (
                                  <p className="text-slate-600 text-sm">
                                    No choices available.
                                  </p>
                                );
                              })()}
                              {beatBufferEnabled && pendingReactionText ? (
                                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800">
                                  {pendingReactionText.split("\n\n").map((para, idx) => (
                                    <p key={idx} className="text-sm">
                                      {para}
                                    </p>
                                  ))}
                                  {relationshipDebugEnabled &&
                                  lastRelSummary.length > 0 ? (
                                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                                      <p className="font-semibold text-slate-700">
                                        Relationship changes
                                      </p>
                                      {lastRelSummary.map((line, idx) => (
                                        <p key={idx}>{line}</p>
                                      ))}
                                    </div>
                                  ) : null}
                                  <Button
                                    className="mt-3"
                                    onClick={handleReactionContinue}
                                  >
                                    Continue
                                  </Button>
                                </div>
                              ) : null}
                              {(outcomeMessage || outcomeDeltas) &&
                                !consequenceActive &&
                                !pendingReactionText && (
                                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                    {outcomeMessage ? <p>{outcomeMessage}</p> : null}
                                    {outcomeDeltas ? (
                                      <ul className="mt-1 space-y-0.5 text-slate-700">
                                        {typeof outcomeDeltas.energy === "number" ? (
                                          <li>
                                            Energy{" "}
                                            {outcomeDeltas.energy >= 0 ? "+" : ""}
                                            {outcomeDeltas.energy}
                                          </li>
                                        ) : null}
                                        {typeof outcomeDeltas.stress === "number" ? (
                                          <li>
                                            Stress{" "}
                                            {outcomeDeltas.stress >= 0 ? "+" : ""}
                                            {outcomeDeltas.stress}
                                          </li>
                                        ) : null}
                                        {featureFlags.resources && outcomeDeltas.vectors
                                          ? Object.entries(outcomeDeltas.vectors).map(
                                              ([key, delta]) => (
                                                <li key={key}>
                                                  {key}: {delta >= 0 ? "+" : ""}
                                                  {delta}
                                                </li>
                                              )
                                            )
                                          : null}
                                      </ul>
                                    ) : null}
                                    {lastCheck ? (
                                      <TesterOnly>
                                        <OutcomeExplain check={lastCheck} />
                                      </TesterOnly>
                                    ) : null}
                                    {featureFlags.afterActionCompareEnabled &&
                                    compareVisible ? (
                                      <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                                        <div className="flex items-center justify-between">
                                          <p className="font-semibold">
                                            Cohort comparison
                                          </p>
                                          <Button
                                            variant="ghost"
                                            onClick={handleCompareDismiss}
                                          >
                                            Dismiss
                                          </Button>
                                        </div>
                                        {compareLoading ? (
                                          <p className="text-sm text-slate-600">
                                            Loading…
                                          </p>
                                        ) : compareSnapshot ? (
                                          <div className="space-y-2">
                                            <ul className="space-y-1">
                                              {compareSnapshot.options.map((opt) => (
                                                <li key={opt.choice_id}>
                                                  {choiceLabelMap.get(opt.choice_id) ??
                                                    opt.choice_id}
                                                  : {opt.percent}%
                                                </li>
                                              ))}
                                            </ul>
                                            {compareSnapshot.rationale ? (
                                              <p className="text-xs text-slate-600">
                                                {compareSnapshot.rationale.handle}:{" "}
                                                {compareSnapshot.rationale.text}
                                              </p>
                                            ) : (
                                              <p className="text-xs text-slate-500">
                                                Not enough data yet.
                                              </p>
                                            )}
                                          </div>
                                        ) : compareError ? (
                                          <p className="text-xs text-slate-500">
                                            {compareError}
                                          </p>
                                        ) : null}
                                        <div className="mt-3 space-y-2">
                                          <label className="block text-xs text-slate-500">
                                            Share a short note (optional)
                                          </label>
                                          <input
                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            value={compareNote}
                                            onChange={(e) =>
                                              setCompareNote(e.target.value)
                                            }
                                          />
                                          <Button
                                            variant="outline"
                                            onClick={handleCompareSubmit}
                                            disabled={compareSending}
                                          >
                                            {compareSending ? "Saving..." : "Share note"}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              {consequenceActive && (
                                <ConsequenceMoment
                                  message={outcomeMessage}
                                  deltas={outcomeDeltas}
                                  onDone={finishConsequence}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                  {USE_DAILY_LOOP_ORCHESTRATOR &&
                    featureFlags.alignment &&
                    !arcOneMode &&
                    factions.length > 0 && (
                    <section className="space-y-3">
                      <FactionStatusPanel
                        factions={factions}
                        alignment={alignment}
                        directive={directive}
                        recentEvents={recentAlignmentEvents}
                        worldState={worldState ?? undefined}
                        cohortState={cohortState ?? undefined}
                        rivalry={rivalry ?? undefined}
                        dayIndex={dayIndex}
                      />
                    </section>
                    )}

                  {USE_DAILY_LOOP_ORCHESTRATOR && stage === "microtask" && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Micro-task</h2>
                        <span className="text-sm text-slate-600">
                          Optional · ~1 minute
                        </span>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
                        <PatternMatchTask
                          onComplete={handleMicroTaskComplete}
                          onSkip={handleMicroTaskSkip}
                        />
                        {microTaskSaving ? (
                          <p className="text-xs text-slate-500">Saving…</p>
                        ) : null}
                      </div>
                    </section>
                  )}

                  {(stage === "social" ||
                    (!USE_DAILY_LOOP_ORCHESTRATOR && allocationSaved && !currentStorylet)) && (
                    <section className="space-y-3">
                      {featureFlags.askOfferBoardEnabled && cohortId ? (
                        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                          <div>
                            <h2 className="text-xl font-semibold">Ask / Offer Board</h2>
                            <p className="text-sm text-slate-600">
                              Share a short ask or offer with your circle.
                            </p>
                            {featureFlags.buddySystemEnabled && buddyAssignment ? (
                              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                <p>
                                  Buddy:{" "}
                                  {buddyAssignment.buddy_type === "human"
                                    ? "Human (same circle)"
                                    : "AI fallback"}
                                </p>
                                {buddyAssignment.buddy_type === "human" ? (
                                  <p>
                                    Handle: {`Handle ${buddyAssignment.buddy_user_id?.slice(0, 4)}`}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {getBuddyNudges().map((nudge) => (
                                    <Button
                                      key={nudge.id}
                                      variant="outline"
                                      onClick={() => {
                                        setBuddyNudge(nudge.message);
                                        trackBuddyNudge(nudge.id);
                                      }}
                                    >
                                      {nudge.label}
                                    </Button>
                                  ))}
                                </div>
                                {buddyNudge ? (
                                  <p className="mt-2 text-sm text-slate-700">
                                    {buddyNudge}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          {askOfferError ? (
                            <p className="text-sm text-red-600">{askOfferError}</p>
                          ) : null}
                          <div className="space-y-2">
                            <label className="block text-sm text-slate-700">
                              Post type
                            </label>
                            <select
                              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                              value={askOfferType}
                              onChange={(e) =>
                                setAskOfferType(
                                  e.target.value === "offer" ? "offer" : "ask"
                                )
                              }
                            >
                              <option value="ask">ASK — I need advice on…</option>
                              <option value="offer">OFFER — I chose X because…</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm text-slate-700">
                              Your message (max 160)
                            </label>
                            <textarea
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                              rows={3}
                              value={askOfferBody}
                              onChange={(e) => setAskOfferBody(e.target.value)}
                            />
                            <Button
                              variant="secondary"
                              onClick={handleCreateAskOffer}
                              disabled={askOfferPosting}
                            >
                              {askOfferPosting ? "Posting..." : "Post to circle"}
                            </Button>
                          </div>
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Recent posts</h3>
                            {askOfferLoading ? (
                              <p className="text-sm text-slate-600">Loading…</p>
                            ) : askOfferPosts.length === 0 ? (
                              <p className="text-sm text-slate-600">
                                No posts yet. Be the first to share.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {askOfferPosts.map((post) => (
                                  <div
                                    key={post.id}
                                    className="rounded-md border border-slate-200 px-3 py-3"
                                  >
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      <span className="uppercase tracking-wide">
                                        {post.post_type}
                                      </span>
                                      <span>{post.author_handle}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-800">
                                      {post.body}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                      <Button
                                        variant={post.helpful_given ? "secondary" : "outline"}
                                        onClick={() => handleHelpful(post.id)}
                                        disabled={post.helpful_given || helpfulSending[post.id]}
                                      >
                                        Helpful · {post.helpful_count}
                                      </Button>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs text-slate-500">
                                        Quick reply
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {[
                                          {
                                            key: "one_small_step",
                                            label: "One small step helped me.",
                                          },
                                          {
                                            key: "offer_tip",
                                            label: "I can offer a quick tip.",
                                          },
                                          {
                                            key: "try_this",
                                            label: "I tried this.",
                                          },
                                        ].map((template) => (
                                          <Button
                                            key={template.key}
                                            variant="outline"
                                            onClick={() =>
                                              handleSendReply(post.id, template.key)
                                            }
                                            disabled={replySending[post.id]}
                                          >
                                            {template.label}
                                          </Button>
                                        ))}
                                      </div>
                                      <input
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                                        placeholder="Add a short note (optional)"
                                        value={replyNotes[post.id] ?? ""}
                                        onChange={(e) =>
                                          setReplyNotes((prev) => ({
                                            ...prev,
                                            [post.id]: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                    {post.replies.length > 0 ? (
                                      <div className="mt-3 space-y-2">
                                        <p className="text-xs text-slate-500">
                                          Replies
                                        </p>
                                        <ul className="space-y-2">
                                          {post.replies.map((reply) => (
                                            <li
                                              key={reply.id}
                                              className="rounded-md border border-slate-100 bg-slate-50 px-2 py-2 text-sm"
                                            >
                                              <p className="text-xs text-slate-500">
                                                {reply.author_handle}
                                              </p>
                                              <p className="text-slate-700">
                                                {reply.body ?? "Shared a quick reply."}
                                              </p>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                      <h2 className="text-xl font-semibold">Send a Boost</h2>
                      {boostMessage ? (
                        <p className="text-sm text-slate-700">{boostMessage}</p>
                      ) : null}
                      {hasSentBoost ? (
                        <p className="text-slate-700">Boost sent for today ✅</p>
                      ) : publicProfiles.length === 0 ? (
                          <p className="text-slate-700">
                            No other players yet. Invite someone and try again.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <label className="block text-sm text-slate-700">
                              Choose a player
                            </label>
                            <select
                              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                              value={selectedRecipient}
                              onChange={(e) => setSelectedRecipient(e.target.value)}
                              disabled={loadingSocial}
                            >
                              {publicProfiles.map((p) => (
                                <option key={p.user_id} value={p.user_id}>
                                  {p.display_name}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              onClick={handleSendBoost}
                              disabled={!selectedRecipient || loadingSocial}
                            >
                              {loadingSocial ? "Sending..." : "Send Boost"}
                            </Button>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Boosts Received Today</h3>
                          {boostsReceived.length === 0 ? (
                            <p className="text-sm text-slate-700">
                              None yet. Maybe tomorrow.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {boostsReceived.map((boost, idx) => {
                                const sender =
                                  publicProfiles.find(
                                    (p) => p.user_id === boost.from_user_id
                                  )?.display_name ?? "Unknown player";
                                return (
                                  <li
                                    key={`${boost.from_user_id}-${idx}`}
                                    className="rounded border border-slate-200 bg-white px-3 py-2 text-slate-800"
                                  >
                                    {sender} sent you a boost.
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                    </section>
                  )}

                  {featureFlags.remnantSystemEnabled &&
                    slicePhaseId === "remnant_reveal" && (
                    <section className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                      <div>
                        <h2 className="text-xl font-semibold">Remnant reveal</h2>
                        <p className="text-sm text-slate-600">
                          One fragment carries into the next run.
                        </p>
                      </div>
                      {remnantState?.unlocked?.length ? (
                        <div className="space-y-3">
                          {remnantState.unlocked.map((remnant) => {
                            const selected = remnantState.active?.key === remnant.key;
                            return (
                              <div
                                key={remnant.key}
                                className="rounded-md border border-slate-200 px-3 py-3"
                              >
                                <p className="font-semibold text-slate-900">
                                  {remnant.name}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {remnant.description}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {remnant.effect}
                                </p>
                                <Button
                                  variant={selected ? "secondary" : "outline"}
                                  onClick={() =>
                                    handleSelectRemnant(remnant.key as RemnantKey)
                                  }
                                  className="mt-2"
                                >
                                  {selected ? "Selected" : "Select remnant"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No remnant yet. Stay with the thread a little longer.
                        </p>
                      )}
                    </section>
                  )}

                  {featureFlags.verticalSlice30Enabled &&
                    slicePhaseId === "cliffhanger" && (
                    <section className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                      <div>
                        <h2 className="text-xl font-semibold">Cliffhanger</h2>
                        <p className="text-sm text-slate-700">
                          Something follows you out of today. The next run starts
                          with what you chose to keep.
                        </p>
                      </div>
                      <Button
                        onClick={handleRunReset}
                        disabled={runResetting}
                        className="w-full"
                      >
                        {runResetting ? "Starting next run..." : "Start Next Run"}
                      </Button>
                    </section>
                  )}

              {USE_DAILY_LOOP_ORCHESTRATOR && stage === "reflection" && arcOneReflectionReady ? (
                <section className="space-y-3">
                  <ArcOneReflection
                    summaryLines={arcOneReflectionLines}
                    prompt={buildReplayPrompt()}
                    submitting={arcOneReflectionSaving}
                    onSelect={handleArcOneReplayIntention}
                  />
                  <TesterOnly>
                    <TesterFeedback
                      dayIndex={dayIndex}
                      context={{
                        lifePressureState: arcOneState?.lifePressureState,
                        energyLevel: arcOneState?.energyLevel,
                        moneyBand: arcOneState?.moneyBand,
                        skillFlags: arcOneState?.skillFlags,
                        npcMemory: arcOneState?.npcMemory,
                        replayIntention: arcOneState?.replayIntention,
                        expiredOpportunities: arcOneState?.expiredOpportunities,
                      }}
                      label="Leave feedback"
                    />
                  </TesterOnly>
                </section>
              ) : USE_DAILY_LOOP_ORCHESTRATOR && stage === "reflection" ? (
                <ReflectionSection
                  saving={reflectionSaving}
                  onReflection={handleReflection}
                />
              ) : null}
              {USE_DAILY_LOOP_ORCHESTRATOR &&
                featureFlags.funPulse &&
                stage === "fun_pulse" && (
                <section className="space-y-3 rounded-md border border-purple-200 bg-purple-50/70 px-4 py-4">
                  <FunPulse
                    onSelect={handleFunPulseSelect}
                    onSkip={handleFunPulseSkip}
                    disabled={funPulseSaving}
                  />
                </section>
              )}
                </>
              )}
              </div>

              <div className="space-y-4">
                <ProgressPanel
                  dailyState={dailyState}
                  dayState={dayState}
                  skillBank={skillBank}
                  lastAppliedDeltas={outcomeDeltas}
                  boostsReceivedCount={boostsReceived.length}
                  skills={skills}
                  resourcesEnabled={featureFlags.resources && !arcOneMode}
                  skillsEnabled={skillUiEnabled}
                  scarcityMode={arcOneMode}
                  energyLevel={arcOneState?.energyLevel}
                  onResourcesHoverStart={() => startHover("resources_panel")}
                  onResourcesHoverEnd={() => endHover("resources_panel")}
                  onVectorsHoverStart={() => startHover("vectors_panel")}
                  onVectorsHoverEnd={() => endHover("vectors_panel")}
                />
              </div>
            </div>
          )}
        </div>
  );
}
