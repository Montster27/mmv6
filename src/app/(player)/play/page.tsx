"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import type { MiniGameType, MiniGameResult } from "@/types/storylets";

const MiniGameShell = dynamic(
  () => import("@/components/minigames/MiniGameShell"),
  { ssr: false }
);

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { ConsequenceMoment } from "@/components/storylets/ConsequenceMoment";
import { FunPulse } from "@/components/FunPulse";
import { FactionStatusPanel } from "@/components/play/FactionStatusPanel";
import { InitiativePanel } from "@/components/play/InitiativePanel";
import { DailySetupPanel } from "@/components/play/DailySetupPanel";
import { PlaySkeleton } from "@/components/skeletons/PlaySkeleton";
import { AllocationSection } from "@/components/play/AllocationSection";
import DaySummaryCard from "@/components/play/DaySummaryCard";
import { ReflectionSection } from "@/components/play/ReflectionSection";
import { ChapterOneReflection } from "@/components/play/ChapterOneReflection";
import { TesterFeedback } from "@/components/play/TesterFeedback";
import { NarrativeFeedback } from "@/components/play/NarrativeFeedback";
// All time advancement (segment + day) goes through /api/time/advance.
import { trackEvent } from "@/lib/events";
import { supabase } from "@/lib/supabase/browser";
import { getOrCreateDailyRun } from "@/core/engine/dailyLoop";
import { awardAnomalies } from "@/lib/anomalies";
import { appendGroupFeedEvent } from "@/lib/groups/feed";
import { incrementGroupObjective } from "@/lib/groups/objective";
import { upsertFunPulse } from "@/lib/funPulse";
import { useExperiments } from "@/lib/experiments";
import { fetchDevSettings, saveDevSettings } from "@/lib/devSettings";
import {
  createStoryletRun,
  fetchDailyState,
  fetchGameEntryStorylet,
  fetchStoryletBySlug,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  markDailyComplete,
  saveTimeAllocation,
  applyOutcomeForChoice,
  applyResourceDeltaToDayState,
  toChoices,
  updateRelationships,
  updateLifePressureState,
  updateSkillFlags,
  updatePreclusionGates,
  type AllocationPayload,
} from "@/lib/play";
import { upsertReflection } from "@/lib/reflections";
import {
  allocateSkillPoint,
  fetchTensions,
  resolveTension,
  submitPosture,
} from "@/lib/dailyInteractions";
import { fetchCohortRoster } from "@/lib/cohorts";
import { contributeToInitiative } from "@/lib/initiatives";
import { getBuddyNudges, getOrAssignBuddy, trackBuddyNudge } from "@/lib/buddy";
import {
  fetchCompareSnapshot,
  submitRationale,
  type CompareSnapshot,
} from "@/lib/afterActionCompare";
import { mapLegacyResourceKey, resourceLabel } from "@/core/resources/resourceMap";
import { getChapterOneState, bumpLifePressure, updateSkillFlag } from "@/core/chapter/state";
import {
  applyRelationshipEvents,
  ensureRelationshipDefaults,
  mapLegacyNpcKnowledge,
  mapLegacyRelationalEffects,
  migrateLegacyNpcMemory,
  renderNpcName,
  type RelationshipEvent,
} from "@/lib/relationships";
import { getDisplayBody } from "@/domain/npcs/registry";
import { CHAPTER_ONE_LAST_DAY } from "@/core/chapter/constants";
import { skillCostForLevel } from "@/core/sim/skillProgression";
import { buildReflectionSummary, buildReplayPrompt } from "@/core/chapter/reflection";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type { TelemetryEvent } from "@/types/telemetry";
import type {
  DailyPosture,
} from "@/types/dailyInteraction";
import type { ReflectionResponse } from "@/types/reflections";
import { useSession } from "@/contexts/SessionContext";
import { ProgressPanel } from "@/components/ProgressPanel";
import { SkillWebPanel } from "@/components/SkillWebPanel";
import type { SkillWebState } from "@/types/skillWeb";
import { OutcomeExplain } from "@/components/play/OutcomeExplain";
import { isEmailAllowed } from "@/lib/adminAuth";
import { getDailyStageCopy } from "@/lib/ui/dailyStageCopy";
import { useDailyProgress, useGameContent } from "./hooks";
import { useStoryletAudio } from "@/hooks/useStoryletAudio";
import { MessageCard } from "@/components/ux/MessageCard";
import { TesterOnly } from "@/components/ux/TesterOnly";
import { gameMessage, testerMessage } from "@/lib/messages";
import { getAppMode } from "@/lib/mode";
import { getFeatureFlags } from "@/lib/featureFlags";
import {
  getMiniGameOutcomeId,
  resolveChoiceOutcomeById,
} from "@/lib/minigames/resolveMiniGameChoice";
import { useBootstrap } from "@/hooks/queries/useBootstrap";
import { useDailyRun } from "@/hooks/queries/useDailyRun";
import { matchesRequirement } from "@/core/storylets/reactionRequirements";
import { TrackStoryletCard } from "@/components/play/TrackStoryletCard";
import { DialogueNodeView } from "@/components/play/DialogueNodeView";
import { SleepCard } from "@/components/play/SleepCard";
import { SegmentTransitionCard } from "@/components/play/SegmentTransitionCard";
import { WeeklyCalendar } from "@/components/play/WeeklyCalendar";
import { InterruptionTransitionCard } from "@/components/play/InterruptionTransitionCard";
import { SkillsNudge } from "@/components/play/SkillsNudge";
import { RoutineWeekSummary } from "@/components/play/RoutineWeekSummary";
import { computeWeekStart } from "@/core/routine/constants";
import { getBridgeText } from "@/lib/segmentBridge";
import type { Segment as BridgeSegment } from "@/lib/segmentBridge";
import type { TrackStorylet } from "@/types/tracks";
import type { StoryletChoice } from "@/types/storylets";
import { useQueryClient } from "@tanstack/react-query";

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

type PendingMiniGameResolution = {
  sourceKey: string;
  result: MiniGameResult;
};

function buildStoryletMiniGameSourceKey(storyletId: string, choiceId: string) {
  return `storylet:${storyletId}:${choiceId}`;
}

function buildTrackMiniGameSourceKey(progressId: string, optionId: string) {
  return `track:${progressId}:${optionId}`;
}

function appendMiniGameHookText(
  baseText: string | null,
  result: MiniGameResult | null
) {
  const extras = [
    result?.meta?.storyletHookText,
    result?.meta?.anomalyText,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (extras.length === 0) return baseText;
  if (!baseText || baseText.trim().length === 0) return extras.join("\n\n");
  return `${baseText}\n\n${extras.join("\n\n")}`;
}

export default function PlayPage() {
  const session = useSession();
  const router = useRouter();
  const { toast } = useToast();
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
    setOutcomeMessage,
    setOutcomeDeltas,
    setLastCheck,
    setDailyProgress,
  } = useDailyProgress(defaultAllocation);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [savingChoice, setSavingChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const { assignments, ready: experimentsReady } = useExperiments(
    [],
    bootstrapAssignments
  );
  const experiments = useMemo(() => assignments, [assignments]);
  const servedStoryletsRef = useRef<string | null>(null);
  const dayStateRef = useRef(dayState);
  const [showDevMenu, setShowDevMenu] = useState(() => getAppMode().testerMode);
  const [refreshTick, setRefreshTick] = useState(0);
  const queryClient = useQueryClient();
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
  const [chapterOneReflectionSaving, setChapterOneReflectionSaving] = useState(false);
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
  // ── Mini-game state ─────────────────────────────────────────────────────
  const [activeMiniGame, setActiveMiniGame] = useState<{
    type: MiniGameType;
    choiceId: string;
    sourceKey: string;
    config?: Record<string, unknown>;
    previewOnly?: boolean;
    /** When the mini-game was triggered from a track storylet, store it to resume. */
    pendingTrackStorylet?: { storylet: TrackStorylet; option: StoryletChoice };
  } | null>(null);
  const [pendingReactionText, setPendingReactionText] = useState<string | null>(
    null
  );
  const [pendingAdvanceTarget, setPendingAdvanceTarget] = useState<string | null>(
    null
  );
  const [compareSending, setCompareSending] = useState(false);
  const [testerEventLog, setTesterEventLog] = useState<TelemetryEvent[]>([]);
  const [runResetting, setRunResetting] = useState(false);
  const sessionIdRef = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
  const nextRunTrackedRef = useRef(false);
  const firstChoiceTrackedRef = useRef(false);
  const [cohortRoster, setCohortRoster] = useState<{
    count: number;
    handles: string[];
  } | null>(null);
  // Stores the `storylet_key` of storylets the player has resolved this segment.
  // NOT progress_id — one progress row (per-track) can surface multiple storylets
  // across a day (e.g., dorm_hallmates in morning, lunch_floor in afternoon), and
  // using progress_id here would filter lunch_floor out the moment dorm_hallmates
  // resolved, because the same progress_id lingers in the set across the refetch
  // window between segment advances.
  const [resolvedTrackStoryletIds, setResolvedTrackStoryletIds] = useState<Set<string>>(
    new Set()
  );
  const [pendingDismissalBeats, setPendingDismissalBeats] = useState<
    Array<{ beat: TrackStorylet; chosenOption: StoryletChoice }>
  >([]);
  // Set when all arc beats are resolved but allocation hasn't been saved yet.
  // Holds up markDailyComplete until after the player sets their time allocation.
  const [awaitingAllocation, setAwaitingAllocation] = useState(false);
  const [sleepCardDone, setSleepCardDone] = useState(false);
  const [bridgeText, setBridgeText] = useState<string | null>(null);
  const [skillWebOpen, setSkillWebOpen] = useState(false);
  const [skillWebState, setSkillWebState] = useState<SkillWebState>({
    skills: [],
    composites: [],
  });

  const isAdmin =
    Boolean(session?.user?.email && isEmailAllowed(session.user.email)) ||
    devIsAdmin ||
    bootstrapIsAdmin;
  const dailyRunQuery = useDailyRun(bootstrapUserId, {
    experiments,
    isAdmin,
    enabled:
      USE_DAILY_LOOP_ORCHESTRATOR &&
      bootstrapReady &&
      experimentsReady &&
      !!bootstrapUserId,
    refreshKey: refreshTick,
  });

  // Keep dayStateRef in sync so async handlers always read the latest value
  useEffect(() => { dayStateRef.current = dayState; }, [dayState]);

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

  // Fetch skill web on bootstrap
  useEffect(() => {
    if (!bootstrapUserId) return;
    const token = session?.access_token;
    if (!token) return;
    fetch("/api/skills/web", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.skills) setSkillWebState(data);
      })
      .catch(() => {});
  }, [bootstrapUserId, session?.access_token]);

  const testerMode = useMemo(() => getAppMode().testerMode, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const featureFlags = useMemo(() => getFeatureFlags(), [featureFlagsVersion]);
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
  const [consequenceActive, setConsequenceActive] = useState(false);
  const sessionStartTracked = useRef(false);
  const sessionEndTracked = useRef(false);
  const stageRef = useRef<DailyRunStage | null>(null);
  const stageStartedAtRef = useRef<number | null>(null);
  const latestStageRef = useRef<DailyRunStage | null>(null);
  const latestDayIndexRef = useRef<number | null>(null);
  const lastRunDayIndexRef = useRef<number | null>(null);
  const funPulseShownTracked = useRef(false);
  const pendingTransitionRef = useRef<(() => void) | null>(null);
  const pendingMiniGameResolutionRef = useRef<PendingMiniGameResolution | null>(
    null
  );

  const dayIndex = useMemo(
    () => dailyState?.day_index ?? dayIndexState,
    [dailyState?.day_index, dayIndexState]
  );
  const chapterOneMode = useMemo(
    () =>
      featureFlags.chapterOneScarcityEnabled && dayIndex <= CHAPTER_ONE_LAST_DAY,
    [featureFlags.chapterOneScarcityEnabled, dayIndex]
  );
  const beatBufferEnabled = Boolean(featureFlags.beatBufferEnabled);
  const relationshipDebugEnabled = Boolean(featureFlags.relationshipDebugEnabled);
  const npcNameForId = useCallback((npcId: string) => {
    if (npcId === "npc_roommate_scott") return "Scott";
    if (npcId === "npc_floor_doug") return "Doug";
    return npcId;
  }, []);
  const chapterOneState = useMemo(
    () => (chapterOneMode ? getChapterOneState(dailyState) : null),
    [chapterOneMode, dailyState]
  );
  const trackStorylets = useMemo(
    () => dailyRunQuery.data?.trackStorylets ?? [],
    [dailyRunQuery.data?.trackStorylets]
  );
  // Visible = not yet resolved client-side. Use this for UI gating (transition
  // cards, auto-advance) so stale query data doesn't hide the segment advance
  // when all beats have been resolved but the refetch hasn't landed yet.
  const visibleTrackCount = useMemo(
    () => trackStorylets.filter((b) => !resolvedTrackStoryletIds.has(b.storylet_key)).length,
    [trackStorylets, resolvedTrackStoryletIds]
  );
  // ── Phase 4: Routine-Week Mode data ──
  const gameMode = dailyRunQuery.data?.gameMode ?? "daily";
  const routineActivities = dailyRunQuery.data?.routineActivities;
  const routineWeekState = dailyRunQuery.data?.routineWeekState;
  const committedSchedule = dailyRunQuery.data?.committedSchedule;
  const interruptionCard = dailyRunQuery.data?.interruptionCard;
  const routineWeekStart = useMemo(() => computeWeekStart(dayIndex), [dayIndex]);

  const handleRoutineCommit = useCallback(async (activityKeys: string[]) => {
    if (!userId) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/routine/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ week_start: routineWeekStart, activity_keys: activityKeys }),
    });
    if (res.ok) {
      setRefreshTick((t) => t + 1);
    }
  }, [userId, routineWeekStart]);

  const handleRoutineResume = useCallback(async () => {
    if (!userId || !routineWeekState) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/routine/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ week_start: routineWeekState.diegetic_week_start }),
    });
    if (res.ok) {
      setRefreshTick((t) => t + 1);
    }
  }, [userId, routineWeekState]);

  const handlePlanNextWeek = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  // Clear resolved IDs when fresh track storylet data arrives.
  // IMPORTANT: only depend on trackStorylets reference — NOT allocationSaved
  // or other state. Adding extra deps caused spurious resets that cleared
  // resolvedTrackStoryletIds while stale trackStorylets data still contained
  // the just-resolved storylet, making it flash back with choice buttons.
  useEffect(() => {
    setResolvedTrackStoryletIds(new Set());
  }, [dailyRunQuery.data?.trackStorylets]);

  // Separate effect for allocation gating — must not reset resolvedTrackStoryletIds.
  useEffect(() => {
    if (allocationSaved) setAwaitingAllocation(false);
  }, [allocationSaved]);
  const relationshipsState = useMemo(
    () => chapterOneState?.relationships ?? {},
    [chapterOneState?.relationships]
  );
  useEffect(() => {
    if (!chapterOneMode || !dailyState || !userId) return;
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
  }, [chapterOneMode, dailyState?.id, userId, dayIndex, relationshipsState]);
  const chapterOneReflectionReady = Boolean(
    chapterOneMode &&
      chapterOneState &&
      dayIndex >= CHAPTER_ONE_LAST_DAY &&
      !chapterOneState.reflectionDone
  );
  const chapterOneReflectionLines = useMemo(
    () =>
      chapterOneReflectionReady && chapterOneState
        ? buildReflectionSummary({ chapterOneState, moneyBandHistory: [] })
        : [],
    [chapterOneReflectionReady, chapterOneState]
  );
  const skillUiEnabled = useMemo(() => {
    if (!featureFlags.skills || chapterOneMode) return false;
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
    chapterOneMode,
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
  // In chapterOneMode the "complete" screen must not appear while beats are still
  // visible or pending dismissal — the server now prevents this, but guard
  // client-side too for robustness.
  // In chapterOneMode, daily complete must not show until the player has
  // explicitly chosen to sleep (sleepCardDone = true).  Until then,
  // they navigate through segments via the SegmentTransitionCard or SleepCard.
  const showDailyComplete =
    (USE_DAILY_LOOP_ORCHESTRATOR &&
      stage === "complete" &&
      visibleTrackCount === 0 &&
      !awaitingAllocation &&
      !(chapterOneMode && pendingDismissalBeats.length > 0) &&
      !(chapterOneMode && !sleepCardDone)) ||
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
        // Note: isFetching guard removed. With no optimistic updates in
        // handleAdvanceSegment/handleSleep, stale placeholder data is harmless
        // (just displays old state briefly until refetch completes).
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

        } else {
          // Legacy non-orchestrator path (USE_DAILY_LOOP_ORCHESTRATOR is always true)
          const { data: cadenceRow } = await supabase
            .from("daily_states")
            .select("day_index,last_day_completed,last_day_index_completed")
            .eq("user_id", bootstrapUserId)
            .limit(1)
            .maybeSingle();
          const cadenceDayIndex = cadenceRow?.day_index ?? 1;
          const cadenceCompleted =
            cadenceRow?.last_day_completed === new Date().toISOString().slice(0, 10) &&
            cadenceRow?.last_day_index_completed === cadenceDayIndex;
          setDailyProgress({
            dayIndexState: cadenceDayIndex,
            alreadyCompletedToday: cadenceCompleted,
            seasonContext: null,
          });
          const day = cadenceDayIndex;
          const [ds, existingAllocation, existingRuns, candidates] = await Promise.all([
            fetchDailyState(bootstrapUserId),
            fetchTimeAllocation(bootstrapUserId, day),
            fetchTodayRuns(bootstrapUserId, day),
            fetchTodayStoryletCandidates(),
          ]);
          if (ds) {
            setDailyState({ ...ds, day_index: cadenceDayIndex });
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
          const shouldForceEntry =
            featureFlags.chapterOneScarcityEnabled &&
            day <= CHAPTER_ONE_LAST_DAY &&
            day === 1;
          let entryStorylet = shouldForceEntry
            ? candidates.find((c) => (c.tags ?? []).includes("game_entry"))
            : null;
          if (shouldForceEntry && !entryStorylet) {
            // Fallback: try tag-based fetch, then legacy slug
            entryStorylet = await fetchGameEntryStorylet();
            if (!entryStorylet) {
              entryStorylet = await fetchStoryletBySlug("s_d1_the_quad");
            }
          }
          const nextStorylets = entryStorylet
            ? [entryStorylet, ...next.filter((c) => c.id !== entryStorylet.id)].slice(
                0,
                3
              )
            : next;
          setStorylets(nextStorylets);

          const allocationExists = Boolean(existingAllocation);
          setStage(
            cadenceCompleted
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

  const SEGMENT_ORDER = ['morning', 'afternoon', 'evening', 'night'] as const;
  type Segment = typeof SEGMENT_ORDER[number];

  // Synchronous flag — set immediately when an advance starts so auto-advance
  // doesn't fire a concurrent advance while the manual one is still in flight.
  // isFetching (from React Query) isn't enough: it only becomes true AFTER the
  // refetch starts, which happens AFTER the advance-segment POST completes
  // (~100-300ms). The auto-advance timer (400ms) can fire in that gap.
  const advanceInFlightRef = useRef(false);

  // Single entry point for time advance. The server decides whether this is a
  // segment bump or a full day rollover based on daily_states — the client
  // never guesses. Both "Continue to <next> →" buttons and the Sleep button
  // call this; the caller only sets intent-specific UI state (bridge text or
  // sleep-card animation) before/after.
  const postAdvanceTime = async (): Promise<
    | { ok: true; action: "segment" | "day" }
    | { ok: false; alreadyAdvanced: boolean }
  > => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { ok: false, alreadyAdvanced: false };

    const res = await fetch("/api/time/advance", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 409) {
      return { ok: false, alreadyAdvanced: true };
    }
    if (!res.ok) {
      console.error("[time-advance] request failed", res.status);
      return { ok: false, alreadyAdvanced: false };
    }

    const body = (await res.json().catch(() => null)) as
      | { action: "segment" | "day" }
      | null;
    return { ok: true, action: body?.action ?? "segment" };
  };

  const handleAdvanceSegment = async () => {
    if (advanceInFlightRef.current) return;
    advanceInFlightRef.current = true;

    try {
      const ds = dayStateRef.current ?? dayState;
      if (!ds) return;
      const current = (ds.current_segment as Segment | undefined) ?? 'morning';
      const idx = SEGMENT_ORDER.indexOf(current);
      if (idx >= 0 && idx < SEGMENT_ORDER.length - 1) {
        setBridgeText(getBridgeText(SEGMENT_ORDER[idx + 1] as BridgeSegment));
      }
      setSleepCardDone(false);

      const result = await postAdvanceTime();
      if (!result.ok && !result.alreadyAdvanced) return;

      await queryClient.refetchQueries({ queryKey: ["daily-run", userId] });
    } finally {
      advanceInFlightRef.current = false;
    }
  };

  const handleSleep = async () => {
    setSleepCardDone(true);
    try {
      const result = await postAdvanceTime();
      if (!result.ok) {
        setSleepCardDone(false);
        if (result.alreadyAdvanced) {
          await queryClient.refetchQueries({ queryKey: ["daily-run", userId] });
        }
        return;
      }
      setSleepCardDone(false);
      await queryClient.refetchQueries({ queryKey: ["daily-run", userId] });
    } catch (e) {
      console.error("Failed to advance day via sleep", e);
      setSleepCardDone(false);
    }
  };

  const handleStayUp = () => {
    setSleepCardDone(true);
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
    if (!relationshipDebugEnabled || !userId) return;
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
  }, [relationshipDebugEnabled, userId]);

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
        if (awaitingAllocation) {
          // Allocation was deferred to end-of-day — now mark the day complete
          setAwaitingAllocation(false);
          if (userId) {
            try {
              await markDailyComplete(userId, dayIndex);
              incrementGroupObjective(2, "daily_complete").catch(() => {});
            } catch (e) {
              console.error("Failed to mark daily complete after end-of-day allocation", e);
            }
          }
        } else {
          setStage("storylet_1");
        }
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

  const displayBody = currentStorylet
    ? getDisplayBody(
        currentStorylet.body,
        (currentStorylet as any).introduces_npc as string[] | undefined,
        relationshipsState
      )
    : "";

  const choiceLabelMap = useMemo(() => {
    if (!currentStorylet) return new Map<string, string>();
    return new Map(toChoices(currentStorylet).map((choice) => [choice.id, choice.label]));
  }, [currentStorylet]);

  // Ambient audio — Pastime Paradise plays once when the game starts (Day 1, first storylet)
  const shouldPlayIntroAudio = stage === "storylet_1" && dayIndex === 1;
  useStoryletAudio("/assets/audio/paradise.wav", shouldPlayIntroAudio);

  useEffect(() => {
    setSelectedChoiceId(null);
    setPendingReactionText(null);
    setPendingAdvanceTarget(null);
  }, [currentStorylet?.id]);

  // ── Micro-choice persistent effects (node walk) ─────────────────────────
  // Called by DialogueNodeView when a micro-choice carries set_npc_memory,
  // relational_effect, or identity_tags. Effects commit immediately — not
  // deferred to terminal choice resolution.
  const handleMicroEffects = useCallback(
    async (effects: {
      set_npc_memory?: Record<string, Record<string, boolean>>;
      relational_effect?: Record<string, Record<string, number>>;
      identity_tags?: string[];
    }) => {
      if (!userId) return;
      const events: RelationshipEvent[] = [
        ...mapLegacyRelationalEffects(effects.relational_effect),
        ...mapLegacyNpcKnowledge(effects.set_npc_memory),
      ];
      if (events.length > 0) {
        const { next: nextRelationships } = applyRelationshipEvents(
          relationshipsState,
          events,
          { storylet_slug: currentStorylet?.slug ?? "", choice_id: "micro_choice" }
        );
        await updateRelationships(userId, nextRelationships, dayIndex);
        if (dailyState) {
          setDailyState({ ...dailyState, relationships: nextRelationships });
        }
      }
      const tags = effects.identity_tags ?? [];
      if (tags.length > 0 && chapterOneState) {
        const nextLp = bumpLifePressure(chapterOneState.lifePressureState, tags);
        await updateLifePressureState(userId, nextLp);
        if (dailyState) {
          setDailyState({ ...dailyState, life_pressure_state: nextLp });
        }
      }
    },
    [userId, relationshipsState, currentStorylet, dayIndex, dailyState, chapterOneState]
  );

  const handleChoice = async (choiceId: string) => {
    if (!userId || !currentStorylet) return;
    if (pendingReactionText) return;
    recordInteraction();
    const selectedChoice = toChoices(currentStorylet).find(
      (choice) => choice.id === choiceId
    );
    const miniGameSourceKey = buildStoryletMiniGameSourceKey(
      currentStorylet.id,
      choiceId
    );
    const pendingMiniGameResolution = pendingMiniGameResolutionRef.current;
    const pendingMiniGameResult =
      selectedChoice?.mini_game &&
      pendingMiniGameResolution?.sourceKey === miniGameSourceKey
        ? pendingMiniGameResolution.result
        : null;
    setSelectedChoiceId(choiceId);
    setPendingAdvanceTarget(selectedChoice?.targetStoryletId ?? null);

    // ── Mini-game intercept ───────────────────────────────────────────────
    // If this choice triggers a mini-game, show it instead of resolving now.
    // The game's onComplete callback will call handleMiniGameComplete which
    // re-enters handleChoice logic with the game result already captured.
    if (selectedChoice?.mini_game && !pendingMiniGameResult && !activeMiniGame) {
      setActiveMiniGame({
        type: selectedChoice.mini_game.type,
        choiceId,
        sourceKey: miniGameSourceKey,
        config: selectedChoice.mini_game.config,
      });
      return; // wait for game to finish
    }

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
              forcedOutcomeId: getMiniGameOutcomeId(pendingMiniGameResult),
            }
          );

        setDailyState(nextDailyState);
        if (dayState) {
          const hasEnergyStress =
            typeof appliedDeltas.energy === "number" ||
            typeof appliedDeltas.stress === "number";
          const hasResources =
            appliedDeltas.resources &&
            Object.keys(appliedDeltas.resources).length > 0;

          if (hasEnergyStress || hasResources) {
            const nextEnergy =
              typeof appliedDeltas.energy === "number"
                ? Math.max(0, Math.min(100, dayState.energy + appliedDeltas.energy))
                : dayState.energy;
            const nextStress =
              typeof appliedDeltas.stress === "number"
                ? Math.max(0, Math.min(100, dayState.stress + appliedDeltas.stress))
                : dayState.stress;
            // Optimistically apply resource deltas to local UI state
            const res = appliedDeltas.resources ?? {};
            const nextDayState = {
              ...dayState,
              energy: nextEnergy,
              stress: nextStress,
              cashOnHand: dayState.cashOnHand + (res.cashOnHand ?? 0),
              knowledge: dayState.knowledge + (res.knowledge ?? 0),
              socialLeverage: dayState.socialLeverage + (res.socialLeverage ?? 0),
              physicalResilience: Math.max(
                0,
                Math.min(100, dayState.physicalResilience + (res.physicalResilience ?? 0))
              ),
            };
            setDayState(nextDayState);
          }

          // Persist resource deltas to player_day_state (fire-and-forget)
          if (
            appliedDeltas.resources &&
            Object.keys(appliedDeltas.resources).length > 0
          ) {
            applyResourceDeltaToDayState(
              userId,
              dayIndex,
              appliedDeltas.resources
            ).catch((err) =>
              console.error("Failed to persist resource delta from outcome", err)
            );
          }
        }
        const hasVectorDeltas =
          appliedDeltas.vectors &&
          Object.keys(appliedDeltas.vectors).length > 0;
        const hasDeltas =
          typeof appliedDeltas.energy === "number" ||
          typeof appliedDeltas.stress === "number" ||
          hasVectorDeltas ||
          Boolean(
            appliedDeltas.resources &&
              Object.keys(appliedDeltas.resources).length > 0
          );
        beatFallbackMessage = appendMiniGameHookText(
          appliedMessage ?? null,
          pendingMiniGameResult
        );
        setOutcomeMessage(
          beatFallbackMessage || (hasDeltas ? "Choice recorded." : null)
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
        const miniGameAnomalies = pendingMiniGameResult?.meta?.anomalyIds ?? [];
        const combinedAnomalies = [
          ...(resolvedOutcomeAnomalies ?? []),
          ...miniGameAnomalies,
        ];
        if (combinedAnomalies.length) {
          await awardAnomalies({
            userId,
            anomalyIds: combinedAnomalies,
            dayIndex,
            source: currentStorylet.slug ?? currentStorylet.id,
          });
          combinedAnomalies.forEach((anomalyId) => {
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
        appendMiniGameHookText(
          typeof resolvedReactionText === "string" &&
            resolvedReactionText.trim().length > 0
            ? resolvedReactionText.trim()
            : null,
          pendingMiniGameResult
        );
      const beatText =
        reactionText ??
        (beatBufferEnabled && beatFallbackMessage ? beatFallbackMessage : null);
      if (beatText) {
        setPendingReactionText(beatText);
        supabase.from("choice_log").insert({
          user_id: userId,
          day: dayIndex,
          event_type: "BEAT_SHOWN",
          track_id: null,
          track_progress_id: null,
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
          nextStage = "reflection";
        }
        pendingTransitionRef.current = () => setStage(nextStage);
        if (!reactionText) {
          setConsequenceActive(true);
        }
      } else {
        pendingTransitionRef.current = () => setCurrentIndex((i) => i + 1);
        if (!reactionText) {
          setConsequenceActive(true);
        }
      }

      // Auto-mark NPCs declared in introduces_npc as met on first encounter.
      const introducedNpcs = (currentStorylet as any).introduces_npc as string[] | undefined;
      const introEvents: RelationshipEvent[] = (introducedNpcs ?? [])
        .filter((npcId: string) => !relationshipsState[npcId]?.met)
        .map((npcId: string) => ({ npc_id: npcId, type: "INTRODUCED_SELF" as const }));

      const relationshipEvents = [
        ...introEvents,
        ...((selectedChoice?.events_emitted ?? []) as any),
        ...mapLegacyRelationalEffects(selectedChoice?.relational_effects),
        ...mapLegacyNpcKnowledge(selectedChoice?.set_npc_memory),
        ...mapLegacyRelationalEffects(matchedCondition?.relational_effects),
        ...mapLegacyNpcKnowledge(matchedCondition?.set_npc_memory),
        ...((pendingMiniGameResult?.meta?.relationshipEvents ?? []) as RelationshipEvent[]),
      ] as any;
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
            track_id: null,
            track_progress_id: null,
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
          if (relationshipDebugEnabled) {
            setRelDebugEvents((prev) => [payload as any, ...prev].slice(0, 50));
          }
        });
      }
      // Wire identity_tags → lifePressureState
      const choiceIdentityTags = (selectedChoice?.identity_tags ?? []) as string[];
      if (choiceIdentityTags.length > 0 && chapterOneState) {
        const nextLp = bumpLifePressure(chapterOneState.lifePressureState, choiceIdentityTags);
        await updateLifePressureState(userId, nextLp);
        if (dailyState) {
          setDailyState({ ...dailyState, life_pressure_state: nextLp });
        }
      }

      if (pendingMiniGameResult) {
        pendingMiniGameResolutionRef.current = null;
      }

      // Wire skill_modifier → skillFlags
      const skillModifier = selectedChoice?.skill_modifier as string | undefined;
      if (skillModifier && chapterOneState?.skillFlags) {
        const nextFlags = updateSkillFlag(chapterOneState.skillFlags, skillModifier as any);
        await updateSkillFlags(userId, nextFlags);
        if (dailyState) {
          setDailyState({ ...dailyState, skill_flags: nextFlags });
        }
      }

      // Wire precludes → preclusionGates
      const precludes = (selectedChoice?.precludes ?? []) as string[];
      if (precludes.length > 0) {
        const currentGates = (dailyState?.preclusion_gates as string[] | undefined) ?? [];
        const nextGates = [...new Set([...currentGates, ...precludes])];
        await updatePreclusionGates(userId, nextGates);
        if (dailyState) {
          setDailyState({ ...dailyState, preclusion_gates: nextGates });
        }
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("Insufficient ")) {
        toast(msg, { variant: "destructive", duration: 5000 });
      } else {
        setError("Failed to record choice.");
      }
    } finally {
      setSavingChoice(false);
    }
  };

  // ── Mini-game completion handler ──────────────────────────────────────────
  // When a mini-game finishes, it calls this with the result. We resolve the
  // outcome by mapping won→"success" / lost→"failure" outcome id, then resume
  // the normal handleChoice flow by re-calling it (the mini-game intercept
  // won't re-trigger because activeMiniGame will be cleared first).
  // Ref to hold handleTrackStoryletChoice so handleMiniGameComplete can call it
  // without a circular dependency (handleMiniGameComplete is defined first).
  const trackStoryletChoiceRef = useRef<((beat: TrackStorylet, option: StoryletChoice) => Promise<void>) | undefined>(undefined);

  const handleMiniGameComplete = useCallback(
    (result: MiniGameResult) => {
      if (!activeMiniGame) return;
      if (activeMiniGame.previewOnly) {
        setActiveMiniGame(null);
        toast(
          result.won
            ? `Dorm Phone Relay complete. Score ${result.score}.`
            : `Dorm Phone Relay ended. Score ${result.score}.`,
          { duration: 4000 }
        );
        return;
      }
      pendingMiniGameResolutionRef.current = {
        sourceKey: activeMiniGame.sourceKey,
        result,
      };
      const pending = activeMiniGame.pendingTrackStorylet;
      const { choiceId } = activeMiniGame;

      if (pending && trackStoryletChoiceRef.current) {
        setActiveMiniGame(null);
        trackStoryletChoiceRef.current(pending.storylet, pending.option);
      } else {
        setActiveMiniGame(null);
        handleChoice(choiceId);
      }
    },
    [activeMiniGame]
  );

  const handleMiniGameCancel = useCallback(() => {
    pendingMiniGameResolutionRef.current = null;
    if (!activeMiniGame) return;
    const pending = activeMiniGame.pendingTrackStorylet;
    setActiveMiniGame(null);
    if (!pending && !activeMiniGame.previewOnly) {
      setSelectedChoiceId(null);
      setPendingAdvanceTarget(null);
    }
  }, [activeMiniGame]);

  const handleLaunchPhoneRelayPreview = useCallback(() => {
    pendingMiniGameResolutionRef.current = null;
    setShowDevMenu(false);
    setActiveMiniGame({
      type: "phoneRelay",
      choiceId: "__dev_phone_relay_preview__",
      sourceKey: "__dev_phone_relay_preview__",
      previewOnly: true,
      config: {
        hooks: {
          onSuccess: {
            chance: 1,
            storyletHookText: "You handled that call well. People noticed.",
          },
          onMistake: {
            chance: 1,
            anomalyText:
              "The wrong person insists the hall phone never rang at all.",
          },
        },
      },
    });
  }, []);

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
    if (!pendingReactionText) return;
    if (!BEAT_AUTO_ADVANCE_MS) return;
    const timer = window.setTimeout(
      () => handleReactionContinue(),
      BEAT_AUTO_ADVANCE_MS
    );
    return () => window.clearTimeout(timer);
  }, [pendingReactionText]);

  useEffect(() => {
    if (!pendingReactionText) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleReactionContinue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pendingReactionText]);

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

  const handleChapterOneReplayIntention = async (intention: string) => {
    setChapterOneReflectionSaving(true);
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
      setChapterOneReflectionSaving(false);
    }
  };

  const handleTrackStoryletChoice = useCallback(
    async (beat: TrackStorylet, option: StoryletChoice) => {
      const miniGameSourceKey = buildTrackMiniGameSourceKey(
        beat.progress_id,
        option.id
      );
      const pendingMiniGameResolution = pendingMiniGameResolutionRef.current;
      const pendingMiniGameResult =
        option.mini_game &&
        pendingMiniGameResolution?.sourceKey === miniGameSourceKey
          ? pendingMiniGameResolution.result
          : null;
      const forcedOutcomeId = getMiniGameOutcomeId(pendingMiniGameResult);

      // ── Mini-game intercept for track storylets ─────────────────────────
      if (option.mini_game && !pendingMiniGameResult && !activeMiniGame) {
        setActiveMiniGame({
          type: option.mini_game.type,
          choiceId: option.id,
          sourceKey: miniGameSourceKey,
          config: option.mini_game.config,
          pendingTrackStorylet: { storylet: beat, option },
        });
        return; // wait for game to finish — handleMiniGameComplete resumes
      }

      try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No session");

      const res = await fetch("/api/tracks/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress_id: beat.progress_id,
          storylet_key: beat.storylet_key,
          option_key: option.id,
          forced_outcome_id: forcedOutcomeId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        if (body.error === "insufficient_resources") {
          toast(
            (body.message as string) ?? "Not enough resources for this choice.",
            { variant: "destructive", duration: 5000 }
          );
          setSavingChoice(false);
          return;
        }
        throw new Error((body.error as string) ?? "Request failed");
      }

      const resBody = await res.json().catch(() => ({ next_key: null }));

      // --- Resolve conditional reaction text (e.g. money_band conditions) ---
      // Computed BEFORE the optimistic UI flip so the outcome card opens with
      // the correct reaction text instead of rendering empty and patching in.
      const resolvedOutcome =
        resolveChoiceOutcomeById(option, forcedOutcomeId) ?? option.outcome;
      let resolvedOption: StoryletChoice = {
        ...option,
        outcome: resolvedOutcome,
      };
      const conditions = option.reaction_text_conditions;
      if (
        conditions &&
        conditions.length > 0 &&
        (!option.reaction_text || option.reaction_text.trim() === "")
      ) {
        const npcMemForCond = Object.fromEntries(
          Object.entries(relationshipsState).map(([npcId, entry]) => {
            const rec = entry as Record<string, unknown>;
            return [
              npcId,
              {
                met: rec.met === true,
                knows_name: rec.knows_name === true,
                knows_face: rec.knows_face === true,
              },
            ];
          })
        );
        const condContext: Record<string, unknown> = {
          npc_memory: npcMemForCond,
        };
        if (chapterOneState?.moneyBand) {
          condContext.money_band = chapterOneState.moneyBand;
        }
        for (const cond of conditions) {
          if (matchesRequirement(cond.if, condContext)) {
            resolvedOption = { ...option, reaction_text: cond.text };
            break;
          }
        }
      }
      if (
        (!resolvedOption.reaction_text || resolvedOption.reaction_text.trim() === "") &&
        resolvedOutcome?.text
      ) {
        resolvedOption = {
          ...resolvedOption,
          reaction_text: resolvedOutcome.text,
        };
      }
      const resolvedReactionText = appendMiniGameHookText(
        resolvedOption.reaction_text?.trim() ?? null,
        pendingMiniGameResult
      );
      if (resolvedReactionText) {
        resolvedOption = {
          ...resolvedOption,
          reaction_text: resolvedReactionText,
        };
      }

      // ── Optimistic UI flip — happen NOW (pre-relationship network) ──────
      // Gate 0 playtest: clicks felt 1–2s laggy because the outcome card was
      // gated behind the `updateRelationships` round-trip. Relationship
      // writes are non-fatal and best-effort, so we surface the outcome
      // first and persist relationships in the background.
      const outcomeDeltas = (resolvedOption.outcome as {
        deltas?: {
          energy?: number;
          stress?: number;
          resources?: Record<string, number>;
        };
      } | undefined)?.deltas;
      if (outcomeDeltas && dayState) {
        const nextEnergy =
          typeof outcomeDeltas.energy === "number"
            ? Math.max(0, Math.min(100, dayState.energy + outcomeDeltas.energy))
            : dayState.energy;
        const nextStress =
          typeof outcomeDeltas.stress === "number"
            ? Math.max(0, Math.min(100, dayState.stress + outcomeDeltas.stress))
            : dayState.stress;
        const res = outcomeDeltas.resources ?? {};
        setDayState({
          ...dayState,
          energy: nextEnergy,
          stress: nextStress,
          cashOnHand: dayState.cashOnHand + (res.cashOnHand ?? 0),
          knowledge: dayState.knowledge + (res.knowledge ?? 0),
          socialLeverage: dayState.socialLeverage + (res.socialLeverage ?? 0),
          physicalResilience: Math.max(
            0,
            Math.min(100, dayState.physicalResilience + (res.physicalResilience ?? 0))
          ),
        });
      }

      const newResolved = new Set([...resolvedTrackStoryletIds, beat.storylet_key]);
      setResolvedTrackStoryletIds(newResolved);
      // Keep this beat visible until the user dismisses it via the Continue button.
      // Also clear the mini-game overlay here (if active) so both state changes
      // land in the same React batch — prevents the un-resolved card flashing back.
      setPendingDismissalBeats((prev) => [...prev, { beat, chosenOption: resolvedOption }]);

      const anomalyIds = [
        ...((resolvedOption.outcome?.anomalies ?? []) as string[]),
        ...((pendingMiniGameResult?.meta?.anomalyIds ?? []) as string[]),
      ];
      if (userId && anomalyIds.length > 0) {
        await awardAnomalies({
          userId,
          anomalyIds,
          dayIndex,
          source: beat.track_key,
        });
      }

      // --- Apply relationship events (backgrounded; UI already flipped) ---
      if (userId) {
        const introEvents = (beat.introduces_npc ?? [])
          .filter((npcId: string) => !relationshipsState[npcId]?.met)
          .map((npcId: string) => ({ npc_id: npcId, type: "INTRODUCED_SELF" as const }));

        const relationshipEvents = [
          ...introEvents,
          ...((option.events_emitted ?? []) as any),
          ...mapLegacyRelationalEffects(option.relational_effects),
          ...mapLegacyNpcKnowledge(option.set_npc_memory),
          ...((pendingMiniGameResult?.meta?.relationshipEvents ?? []) as RelationshipEvent[]),
        ] as any;

        if (relationshipEvents.length > 0) {
          // Non-fatal: relationship updates are best-effort.
          // Wrap in try-catch so a Supabase error here never prevents the
          // UI from marking the beat resolved and showing the dismiss card.
          try {
            const { next: nextRelationships, logs } = applyRelationshipEvents(
              relationshipsState,
              relationshipEvents,
              { storylet_slug: beat.track_key, choice_id: option.id }
            );
            await updateRelationships(userId, nextRelationships, dayIndex);
            if (dailyState) {
              setDailyState({ ...dailyState, relationships: nextRelationships });
            }
            // Log each relationship change
            logs.forEach((entry) => {
              const flagChanged =
                typeof entry.delta.met === "boolean" ||
                typeof entry.delta.knows_name === "boolean" ||
                typeof entry.delta.knows_face === "boolean";
              const payload = {
                user_id: userId,
                day: dayIndex,
                event_type: "REL_DELTA",
                track_id: null,
                track_progress_id: beat.progress_id,
                step_key: null,
                option_key: option.id,
                delta: entry.delta,
                meta: {
                  storylet_slug: beat.track_key,
                  choice_id: option.id,
                  npc_id: entry.npc_id,
                  kind: flagChanged ? "npc_memory" : "relational",
                  before: entry.before,
                  after: entry.after,
                },
              };
              supabase.from("choice_log").insert(payload);
              if (relationshipDebugEnabled) {
                setRelDebugEvents((prev) => [payload as any, ...prev].slice(0, 50));
              }
            });
          } catch (relErr) {
            console.error("[track-storylet-choice] relationship update failed (non-fatal):", relErr);
          }
        }
      }

      // Only mark day complete when all beats are resolved AND no more steps are queued
      // NOTE: API returns "next_key" (not "next_step_key") — field name was mismatched.
      const hasMoreSteps = resBody.next_key != null;
      if (
        chapterOneMode &&
        userId &&
        !hasMoreSteps &&
        trackStorylets.every((b) => newResolved.has(b.progress_id))
      ) {
        if (!allocationSaved) {
          // Gate daily-complete behind allocation — show it after beats are dismissed
          setAwaitingAllocation(true);
        } else {
          try {
            await markDailyComplete(userId, dayIndex);
            incrementGroupObjective(2, "daily_complete").catch(() => {});
          } catch (e) {
            console.error("Failed to mark daily complete after arc beats", e);
          }
        }
      }
      if (pendingMiniGameResult) {
        pendingMiniGameResolutionRef.current = null;
      }
      } catch (e) {
        console.error("[track-storylet-choice]", e);
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.startsWith("Insufficient ") || msg.includes("Not enough")) {
          toast(msg, { variant: "destructive", duration: 5000 });
        } else {
          toast("Something went wrong. Please try again.", { variant: "destructive" });
        }
        // Clear mini-game overlay on failure so it doesn't get stuck
        setActiveMiniGame(null);
        setSavingChoice(false);
        // Re-throw so TrackStoryletCard's catch block clears chosenOption
        // and restores the choice buttons instead of showing a stuck outcome card.
        throw e;
      }
    },
    [dayIndex, resolvedTrackStoryletIds, trackStorylets, chapterOneMode, userId, relationshipsState, dailyState, relationshipDebugEnabled, chapterOneState, allocationSaved, dayState, setDayState, activeMiniGame, toast]
  );

  // Keep the ref in sync so handleMiniGameComplete can call it without circular deps
  trackStoryletChoiceRef.current = handleTrackStoryletChoice;

  const handleDismissTrackStorylet = useCallback((beat: TrackStorylet, skipRefresh = false) => {
    setPendingDismissalBeats((prev) => prev.filter((entry) => entry.beat.progress_id !== beat.progress_id));
    // Keep resolved ID to prevent flash of old beat; cleared when fresh data arrives.
    // Skip the refresh when the caller will advance the segment — otherwise the
    // premature re-fetch reads the old segment from the DB and overwrites the
    // optimistic update, making the transition appear to do nothing.
    if (!skipRefresh) setRefreshTick((t) => t + 1);
    // Clear bridge text once a beat has been interacted with
    setBridgeText(null);
  }, []);

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
      // In chapterOneMode, only mark complete after the sleep card —
      // otherwise empty segments cause premature day advancement.
      if (chapterOneMode && !sleepCardDone) return;
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
  }, [stage, alreadyCompletedToday, userId, dayIndex, chapterOneMode, sleepCardDone]);

  // chapterOneMode edge case: player returns to page after resolving all beats in a
  // previous session. Server returns trackStorylets=[] but markDailyComplete was never
  // called. Auto-complete so the player sees "Daily complete ✓".
  //
  // Guard: only fire if the user has resolved at least one beat this session
  // OR if the server explicitly returned stage="complete" with no beats.
  // This prevents a fresh game from auto-completing before beats can load.
  const dailyRunDataLoaded = !!dailyRunQuery.data;
  useEffect(() => {
    if (!USE_DAILY_LOOP_ORCHESTRATOR) return;
    if (!chapterOneMode) return;
    if (!userId) return;
    if (loading) return;
    if (alreadyCompletedToday) return;
    if (!dailyRunDataLoaded) return; // wait for data to load
    if (visibleTrackCount > 0) return; // beats still pending
    // In chapterOneMode, don't auto-complete until the player has gone through the
    // sleep card — otherwise empty segments trigger premature day advancement.
    if (!sleepCardDone) return;
    // Only auto-complete when the user has done something this session, or when
    // the server already signalled there are no beats due (stage === "complete").
    if (resolvedTrackStoryletIds.size === 0 && stage !== "complete") return;
    markDailyComplete(userId, dayIndex).catch(console.error);
    incrementGroupObjective(2, "daily_complete").catch(() => {});
    setRefreshTick((t) => t + 1);
  }, [chapterOneMode, visibleTrackCount, userId, dayIndex, loading, alreadyCompletedToday, dailyRunDataLoaded, resolvedTrackStoryletIds.size, stage, sleepCardDone]);

  // Segment transitions auto-advance from inside SegmentTransitionCard (300ms
  // fade on mount → onAdvance → handleAdvanceSegment). The page-level effect
  // that previously auto-advanced via a 400ms timer was removed because it
  // fired with state captured at render time; the in-card timer fires from
  // the render that already decided the card should show, so the race is
  // closed. advanceInFlightRef guards against concurrent advances.
  // See commits 07c047d, 22b3b46, 9bbde1c for the earlier patch chain.

  return (
        <div className="p-4 space-y-4 min-h-screen bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Play</h1>
              <p className="font-stat text-sm tabular-nums text-foreground/70 tracking-wide">
                Day {dayIndex}
                {dayState?.current_segment ? (
                  <span className="ml-2 capitalize">
                    · {dayState.current_segment}
                    {typeof dayState.hours_remaining === "number"
                      ? ` · ${dayState.hours_remaining}h left`
                      : null}
                  </span>
                ) : null}
                {" "}· Energy{" "}
                {dayState?.energy ?? dailyState?.energy ?? "—"} · Stress{" "}
                {dayState?.stress ?? dailyState?.stress ?? "—"}
              </p>
              {/* In chapterOneMode hide the legacy stage copy while beats are pending */}
              {(!chapterOneMode || (visibleTrackCount === 0 && pendingDismissalBeats.length === 0)) && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground/80">
                    {getDailyStageCopy(stage).title}
                  </p>
                  <p>{getDailyStageCopy(stage).body}</p>
                </div>
              )}
              <div className="mt-3 space-y-2">
                <TesterOnly>
                  <MessageCard message={testerNote} variant="inline" />
                </TesterOnly>
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
                {testerMode && chapterOneState ? (
                  <TesterOnly>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">People</p>
                      <div className="mt-2 space-y-2">
                        {["npc_roommate_scott", "npc_floor_doug"].map(
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
                                    {npcId === "npc_roommate_scott"
                                      ? "Scott"
                                      : "Doug"}
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
              onAdvanceSegment={handleAdvanceSegment}
              currentSegment={(dayState?.current_segment as 'morning' | 'afternoon' | 'evening' | 'night' | 'sleeping' | undefined) ?? 'morning'}
              hoursRemaining={dayState?.hours_remaining ?? 16}
              onResetRun={handleRunReset}
              onClose={() => setShowDevMenu(false)}
              onAdvanceDay={handleAdvanceDay}
              onResetAccount={handleResetAccount}
              onToggleAdmin={handleToggleAdmin}
              onLaunchPhoneRelayPreview={handleLaunchPhoneRelayPreview}
              onFlagsChanged={() => setFeatureFlagsVersion((v) => v + 1)}
              relationshipDebugEnabled={relationshipDebugEnabled}
              relDebugEvents={relDebugEvents}
              npcMemory={relationshipsState ?? null}
              relationships={relationshipsState ?? null}
            />
          ) : null}

          {seasonResetPending && !chapterOneMode ? (
            <section className="rounded border-2 border-primary/40 bg-primary px-4 py-4 space-y-3 text-primary-foreground prep-stripe-top">
              <h2 className="text-xl font-bold tracking-wide font-heading">
                Season {seasonIndex ?? "?"} begins
              </h2>
              <p className="text-primary-foreground/80">
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
                <div className="rounded border border-primary-foreground/20 bg-primary/80 px-3 py-3 text-sm text-primary-foreground/90 space-y-1">
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-5">
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {loading ? (
                  <PlaySkeleton />
                ) : showDailyComplete ? (
                  <>
                    <section className="space-y-3 rounded border-2 border-primary/20 bg-card px-4 py-4 prep-stripe-top">
                      <h2 className="text-xl font-bold text-primary font-heading">
                        Daily complete ✓
                      </h2>
                      <p className="text-foreground/70">Come back tomorrow.</p>
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

                  {(!USE_DAILY_LOOP_ORCHESTRATOR &&
                      allocationSaved &&
                      !currentStorylet) && initiatives.length > 0 ? (
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
                    <section className="space-y-3 rounded border-2 border-border bg-card px-4 py-4">
                      <DailySetupPanel
                        tensions={tensions}
                        skillBank={skillBank}
                        posture={posture}
                        dayIndex={dayIndex}
                        allocations={skillAllocations}
                        skills={skills ?? undefined}
                        skillsEnabled={skillUiEnabled}
                        scarcityMode={chapterOneMode}
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
                      resourcesEnabled={featureFlags.resources}
                    />
                  )}

                  {((stage === "storylet_1" ||
                    stage === "storylet_2" ||
                    stage === "storylet_3" ||
                    (!USE_DAILY_LOOP_ORCHESTRATOR && allocationSaved)) && !chapterOneMode) && (
                    <section className="space-y-3">
                        <h2 className="prep-label">Today&apos;s Choices</h2>

                        {!currentStorylet ? (
                          <div className="rounded border-2 border-border bg-card px-3 py-3">
                            {storylets.length === 0 ? (
                              <p className="text-foreground/70">No more storylets today.</p>
                            ) : (
                              <p className="text-foreground/70">Daily complete ✓</p>
                            )}
                            <Button className="mt-3" variant="secondary">
                              Back tomorrow
                            </Button>
                          </div>
                        ) : (
                          <div
                            key={currentStorylet.id}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-lg border-2 border-primary/20 bg-card shadow-sm"
                          >
                            {/* Progress bar */}
                            <div className="h-1 bg-border/40">
                              <div
                                className="h-full bg-primary/60 transition-all duration-500"
                                style={{
                                  width: `${((stage === "storylet_3" ? 3 : stage === "storylet_2" ? 2 : 1) - 1) * 33.33}%`,
                                }}
                              />
                            </div>

                            <div className="space-y-5 px-5 py-5">
                              {/* Step dots */}
                              <div className="flex items-center gap-1.5">
                                {([1, 2, 3] as const).map((n) => {
                                  const cur = stage === "storylet_3" ? 3 : stage === "storylet_2" ? 2 : 1;
                                  return (
                                    <div
                                      key={n}
                                      className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
                                        n <= cur ? "bg-primary" : "bg-border"
                                      }`}
                                    />
                                  );
                                })}
                                <span className="ml-auto font-stat text-xs text-muted-foreground tabular-nums">
                                  {stage === "storylet_3" ? 3 : stage === "storylet_2" ? 2 : 1} of 3
                                </span>
                              </div>

                              {/* Story content */}
                              <div>
                                <h3 className="font-heading text-xl font-bold leading-snug text-primary">
                                  {currentStorylet.title}
                                </h3>
                                {!currentStorylet.nodes?.length && (
                                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
                                    {displayBody}
                                  </p>
                                )}
                              </div>

                              {/* Choices — flat (no nodes) or conversational node walk */}
                              {(!selectedChoiceId || savingChoice) && (() => {
                                const choices = toChoices(currentStorylet);

                                // ── Conversational node rendering ──────────────
                                if (currentStorylet.nodes?.length) {
                                  return (
                                    <DialogueNodeView
                                      preamble={displayBody}
                                      nodes={currentStorylet.nodes}
                                      choices={choices}
                                      onChoice={handleChoice}
                                      onMicroEffects={handleMicroEffects}
                                      disabled={savingChoice}
                                    />
                                  );
                                }

                                // ── Flat prose + choices (existing) ───────────
                                const RESOURCE_LABELS: Record<string, string> = {
                                  cashOnHand: "cash",
                                  knowledge: "knowledge",
                                  socialLeverage: "social leverage",
                                  physicalResilience: "resilience",
                                };
                                return choices.length > 0 ? (
                                  <div className="space-y-2">
                                    {choices.map((choice) => {
                                      const typedChoice = choice as {
                                        id: string;
                                        label: string;
                                        requires_resource?: { key: string; min: number };
                                        costs_resource?: { key: string; amount: number };
                                      };
                                      const reqRes = featureFlags.resources
                                        ? typedChoice.requires_resource
                                        : undefined;
                                      const costRes = featureFlags.resources
                                        ? typedChoice.costs_resource
                                        : undefined;
                                      const meetsGate =
                                        !reqRes || !dayState
                                          ? true
                                          : (((dayState as unknown) as Record<string, number>)[reqRes.key] ?? 0) >= reqRes.min;
                                      const canAffordCost =
                                        !costRes || !dayState
                                          ? true
                                          : (((dayState as unknown) as Record<string, number>)[costRes.key] ?? 0) >= costRes.amount;
                                      const isLocked = !meetsGate || !canAffordCost;
                                      const isDisabled = savingChoice || isLocked;
                                      return (
                                        <div key={typedChoice.id}>
                                          <button
                                            disabled={isDisabled}
                                            onClick={() => handleChoice(typedChoice.id)}
                                            className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all active:scale-[0.99] disabled:cursor-not-allowed ${
                                              isLocked
                                                ? "border-border/40 bg-muted text-foreground/40"
                                                : "border-primary/25 bg-card text-foreground hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                                            }`}
                                          >
                                            <span>{typedChoice.label}</span>
                                            {costRes ? (
                                              <span className={`ml-2 text-xs font-normal ${canAffordCost ? "text-amber-600" : "text-red-400"}`}>
                                                −{costRes.amount}{" "}
                                                {RESOURCE_LABELS[costRes.key] ?? costRes.key}
                                              </span>
                                            ) : null}
                                          </button>
                                          {!meetsGate && reqRes ? (
                                            <p className="mt-0.5 pl-1 text-xs text-red-400 italic">
                                              Need {reqRes.min}{" "}
                                              {RESOURCE_LABELS[reqRes.key] ?? reqRes.key}{" "}
                                              (have {((dayState as unknown) as Record<string, number>)?.[reqRes.key] ?? 0})
                                            </p>
                                          ) : !canAffordCost && costRes ? (
                                            <p className="mt-0.5 pl-1 text-xs text-red-400 italic">
                                              Need {costRes.amount}{" "}
                                              {RESOURCE_LABELS[costRes.key] ?? costRes.key}{" "}
                                              (have {((dayState as unknown) as Record<string, number>)?.[costRes.key] ?? 0})
                                            </p>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No choices available.</p>
                                );
                              })()}

                              {/* Saving spinner */}
                              {savingChoice && (
                                <div className="flex items-center gap-2 py-1">
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                  <span className="text-sm text-muted-foreground">Saving…</span>
                                </div>
                              )}

                              {/* Result phase */}
                              {selectedChoiceId && !savingChoice && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                  {/* Chosen label */}
                                  <div className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                      ✓
                                    </span>
                                    <p className="text-sm font-semibold leading-snug text-primary">
                                      {choiceLabelMap.get(selectedChoiceId) ?? "Choice recorded"}
                                    </p>
                                  </div>

                                  {/* Mini-game overlay */}
                                  {activeMiniGame && (
                                    <div className="my-4">
                                      <MiniGameShell
                                        gameType={activeMiniGame.type}
                                        config={activeMiniGame.config}
                                        onComplete={handleMiniGameComplete}
                                        onCancel={handleMiniGameCancel}
                                      />
                                    </div>
                                  )}

                                  {/* Reaction text */}
                                  {pendingReactionText && (
                                    <div className="space-y-2 pl-7">
                                      {pendingReactionText.split("\n\n").map((para, idx) => (
                                        <p key={idx} className="text-sm leading-relaxed text-foreground/80">
                                          {para}
                                        </p>
                                      ))}
                                      {relationshipDebugEnabled && lastRelSummary.length > 0 ? (
                                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                          {lastRelSummary.map((line, idx) => (
                                            <p key={idx}>{line}</p>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}

                                  {/* Delta chips */}
                                  {outcomeDeltas && (() => {
                                    const chips: Array<{ label: string; delta: number }> = [];
                                    if (typeof outcomeDeltas.energy === "number")
                                      chips.push({ label: "Energy", delta: outcomeDeltas.energy });
                                    if (typeof outcomeDeltas.stress === "number")
                                      chips.push({ label: "Stress", delta: outcomeDeltas.stress });
                                    if (featureFlags.resources && outcomeDeltas.vectors) {
                                      Object.entries(outcomeDeltas.vectors).forEach(([k, v]) =>
                                        chips.push({ label: k, delta: v as number })
                                      );
                                    }
                                    if (featureFlags.resources && outcomeDeltas.resources) {
                                      const LABELS: Record<string, string> = {
                                        cashOnHand: "cash",
                                        knowledge: "knowledge",
                                        socialLeverage: "social leverage",
                                        physicalResilience: "resilience",
                                      };
                                      Object.entries(outcomeDeltas.resources).forEach(([k, v]) => {
                                        if (typeof v === "number" && v !== 0)
                                          chips.push({ label: LABELS[k] ?? k, delta: v });
                                      });
                                    }
                                    if (chips.length === 0) return null;
                                    return (
                                      <div className="flex flex-wrap gap-1.5 pl-7">
                                        {chips.map(({ label, delta }) => (
                                          <span
                                            key={label}
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                              delta > 0
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                            }`}
                                          >
                                            {label} {delta > 0 ? "+" : ""}{delta}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}

                                  {outcomeMessage && outcomeMessage !== pendingReactionText && (
                                    <p className="pl-7 text-sm leading-relaxed text-foreground/80">{outcomeMessage}</p>
                                  )}

                                  {lastCheck ? (
                                    <TesterOnly>
                                      <OutcomeExplain check={lastCheck} />
                                    </TesterOnly>
                                  ) : null}

                                  {/* Cohort compare */}
                                  {featureFlags.afterActionCompareEnabled && compareVisible ? (
                                    <div className="rounded-lg border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
                                      <div className="flex items-center justify-between">
                                        <p className="font-semibold">Cohort comparison</p>
                                        <Button variant="ghost" onClick={handleCompareDismiss}>
                                          Dismiss
                                        </Button>
                                      </div>
                                      {compareLoading ? (
                                        <p className="text-sm text-slate-600">Loading…</p>
                                      ) : compareSnapshot ? (
                                        <div className="space-y-2">
                                          <ul className="space-y-1">
                                            {compareSnapshot.options.map((opt) => (
                                              <li key={opt.choice_id}>
                                                {choiceLabelMap.get(opt.choice_id) ?? opt.choice_id}
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
                                            <p className="text-xs text-slate-500">Not enough data yet.</p>
                                          )}
                                        </div>
                                      ) : compareError ? (
                                        <p className="text-xs text-slate-500">{compareError}</p>
                                      ) : null}
                                      <div className="mt-3 space-y-2">
                                        <label className="block text-xs text-slate-500">
                                          Share a short note (optional)
                                        </label>
                                        <input
                                          className="w-full rounded border-2 border-input bg-card px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          value={compareNote}
                                          onChange={(e) => setCompareNote(e.target.value)}
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

                                  {/* Narrative feedback (tester only) */}
                                  {currentStorylet && (
                                    <TesterOnly>
                                      <NarrativeFeedback
                                        storyletId={currentStorylet.id}
                                        dayIndex={dayIndex}
                                      />
                                    </TesterOnly>
                                  )}

                                  {/* Continue button */}
                                  {(pendingReactionText || consequenceActive) && (
                                    <button
                                      onClick={() => {
                                        setSelectedChoiceId(null);
                                        if (pendingReactionText) {
                                          handleReactionContinue();
                                        } else {
                                          finishConsequence();
                                        }
                                      }}
                                      className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99]"
                                    >
                                      Continue →
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                  {USE_DAILY_LOOP_ORCHESTRATOR &&
                    featureFlags.alignment &&
                    !chapterOneMode &&
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

                  {/* Segment bridge text — shown when advancing to a new segment */}
                  {USE_DAILY_LOOP_ORCHESTRATOR && chapterOneMode && bridgeText && (
                    <div className="relative rounded border border-border/60 bg-muted/40 px-4 py-3 text-sm italic text-foreground/70">
                      <span>{bridgeText}</span>
                      <button
                        onClick={() => setBridgeText(null)}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Global mini-game overlay — shows on top of arc beats when active */}
                  {activeMiniGame?.previewOnly && (
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
                      <div>
                        <h3 className="font-heading text-xl font-semibold text-primary">
                          Dorm Phone Relay Preview
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Temporary dev launcher. This preview is not wired to story content yet.
                        </p>
                      </div>
                      <MiniGameShell
                        gameType={activeMiniGame.type}
                        config={activeMiniGame.config}
                        onComplete={handleMiniGameComplete}
                        onCancel={handleMiniGameCancel}
                      />
                    </div>
                  )}
                  {activeMiniGame && activeMiniGame.pendingTrackStorylet && (
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                      <MiniGameShell
                        gameType={activeMiniGame.type}
                        config={activeMiniGame.config}
                        onComplete={handleMiniGameComplete}
                        onCancel={handleMiniGameCancel}
                      />
                    </div>
                  )}

                  {/* ── Phase 4: Routine-Week Mode ── */}
                  {USE_DAILY_LOOP_ORCHESTRATOR && gameMode === "routine_schedule" && routineActivities && (
                    <WeeklyCalendar
                      activities={routineActivities}
                      weekStart={routineWeekStart}
                      onCommit={handleRoutineCommit}
                      playerFlags={(dailyState?.skill_flags as Record<string, boolean>) ?? {}}
                    />
                  )}

                  {/*
                    Interruption card is gated by featureFlags.routineInterruptionCardEnabled
                    (default false) until the resume path is verified end-to-end.
                    The resume endpoint exists and the click-through is wired, but
                    handleRoutineResume currently re-invokes runWeek which can re-fire
                    the same interruption — producing the "button does nothing"
                    perception from the Gate 0 playtest. Re-enable via
                    NEXT_PUBLIC_ROUTINE_INTERRUPTION_CARD=1 or the local override key
                    `routineInterruptionCardEnabled: true` once runWeek advances past
                    the resolved beat.
                  */}
                  {USE_DAILY_LOOP_ORCHESTRATOR && gameMode === "daily" && interruptionCard && featureFlags.routineInterruptionCardEnabled && (
                    <InterruptionTransitionCard
                      text={interruptionCard.text}
                      onContinue={handleRoutineResume}
                    />
                  )}

                  {USE_DAILY_LOOP_ORCHESTRATOR && routineWeekState?.status === "completed" && committedSchedule && routineActivities && (
                    <RoutineWeekSummary
                      weekStart={routineWeekState.diegetic_week_start}
                      schedule={committedSchedule}
                      activities={routineActivities}
                      onPlanNext={handlePlanNextWeek}
                    />
                  )}

                  {/*
                    Skills discoverability nudge — Day 1 only, once the player
                    has resolved at least one beat (so it lands after a moment
                    of lived fiction, not on a cold start). Dismisses via
                    localStorage; the component returns null once clicked.
                  */}
                  {USE_DAILY_LOOP_ORCHESTRATOR && chapterOneMode && (
                    <SkillsNudge
                      eligible={dayIndex === 1 && resolvedTrackStoryletIds.size > 0}
                    />
                  )}

                  {USE_DAILY_LOOP_ORCHESTRATOR &&
                    chapterOneMode &&
                    gameMode === "daily" &&
                    !activeMiniGame?.pendingTrackStorylet &&
                    (trackStorylets.length > 0 || pendingDismissalBeats.length > 0) && (
                    <section className="space-y-3">
                      <h2 className="prep-label">
                        Today&apos;s Moments
                      </h2>
                      {(() => {
                        // Once every storylet in the segment is resolved and we have at
                        // least one outcome still pending dismissal, collapse the per-card
                        // Continue buttons into a single bottom CTA that atomically
                        // clears pending beats AND advances the segment. Prior per-card
                        // behaviour required N clicks and relied on a refetch race to
                        // surface "Continue to <next> →" on the remaining card — if that
                        // re-render didn't land cleanly the player was stuck.
                        const allResolved = trackStorylets.every(
                          (b) => resolvedTrackStoryletIds.has(b.storylet_key)
                        );
                        const currentSeg = (dayState?.current_segment ?? "morning") as Segment;
                        const canAdvance =
                          allResolved &&
                          pendingDismissalBeats.length > 0 &&
                          currentSeg !== "night" &&
                          (dayState?.hours_remaining ?? 16) > 0;
                        const nextSeg = canAdvance
                          ? SEGMENT_ORDER[SEGMENT_ORDER.indexOf(currentSeg) + 1]
                          : null;
                        const useBottomCta = canAdvance && !!nextSeg;

                        // Serialize into a SINGLE list so a beat keeps its place
                        // across resolve → outcome. Rendering pending-dismissals and
                        // unresolved beats from two separate .map calls treats them
                        // as siblings at different child positions under the
                        // fragment — which forces React to unmount+remount the card
                        // when it swaps between them, replaying narrative-enter
                        // and producing the "blink" seen in Gate 0.
                        //
                        // Rules baked in here:
                        //   - If ANY beat in trackStorylets is unresolved, render
                        //     only the first unresolved beat (avoids contradictory
                        //     directions on screen, e.g. "head to your room" vs
                        //     "head across the quad").
                        //   - Once every beat is resolved, render one card per
                        //     pending dismissal — the collapsed bottom-CTA below
                        //     advances the segment atomically.
                        const firstUnresolvedIdx = trackStorylets.findIndex(
                          (b) => !resolvedTrackStoryletIds.has(b.storylet_key),
                        );
                        const unifiedCards: Array<
                          | { kind: "unresolved"; beat: (typeof trackStorylets)[number] }
                          | { kind: "pending"; beat: (typeof trackStorylets)[number]; chosenOption: StoryletChoice }
                        > = [];
                        if (firstUnresolvedIdx >= 0) {
                          unifiedCards.push({ kind: "unresolved", beat: trackStorylets[firstUnresolvedIdx] });
                        } else {
                          for (const p of pendingDismissalBeats) {
                            unifiedCards.push({ kind: "pending", beat: p.beat, chosenOption: p.chosenOption });
                          }
                        }

                        return (
                          <>
                            {unifiedCards.map((card) =>
                              card.kind === "pending" ? (
                                <TrackStoryletCard
                                  key={card.beat.progress_id}
                                  storylet={card.beat}
                                  dayIndex={dayIndex}
                                  onChoice={handleTrackStoryletChoice}
                                  disabled
                                  resolvedOption={card.chosenOption}
                                  onDismiss={
                                    useBottomCta
                                      ? undefined
                                      : () => handleDismissTrackStorylet(card.beat, false)
                                  }
                                  relationships={relationshipsState}
                                />
                              ) : (
                                <TrackStoryletCard
                                  key={card.beat.progress_id}
                                  storylet={card.beat}
                                  dayIndex={dayIndex}
                                  onChoice={handleTrackStoryletChoice}
                                  moneyBand={chapterOneState?.moneyBand as "tight" | "okay" | "comfortable" | undefined}
                                  relationships={relationshipsState}
                                  resources={dayState ? {
                                    energy: dayState.energy,
                                    stress: dayState.stress,
                                    cashOnHand: dayState.cashOnHand,
                                    knowledge: dayState.knowledge,
                                    socialLeverage: dayState.socialLeverage,
                                    physicalResilience: dayState.physicalResilience,
                                  } : null}
                                />
                              ),
                            )}
                            {useBottomCta && nextSeg && (
                              <div className="pt-2">
                                <Button
                                  size="lg"
                                  className="font-heading"
                                  onClick={() => {
                                    setPendingDismissalBeats([]);
                                    setBridgeText(null);
                                    handleAdvanceSegment();
                                  }}
                                >
                                  {`Continue to ${nextSeg} →`}
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </section>
                  )}

                  {/* Segment transition card — morning/afternoon/evening done, advance to next */}
                  {USE_DAILY_LOOP_ORCHESTRATOR && chapterOneMode &&
                    visibleTrackCount === 0 && pendingDismissalBeats.length === 0 &&
                    !sleepCardDone &&
                    dayState?.current_segment !== 'night' &&
                    (dayState?.hours_remaining ?? 16) > 0 && (
                    <SegmentTransitionCard
                      currentSegment={(dayState?.current_segment ?? 'morning') as 'morning' | 'afternoon' | 'evening' | 'night'}
                      hoursRemaining={dayState?.hours_remaining ?? 16}
                      onAdvance={handleAdvanceSegment}
                    />
                  )}

                  {/* Sleep card — shown at end of night when no beats remain */}
                  {USE_DAILY_LOOP_ORCHESTRATOR && chapterOneMode &&
                    (dayState?.current_segment === 'night' || (dayState?.hours_remaining ?? 16) <= 0) &&
                    visibleTrackCount === 0 && pendingDismissalBeats.length === 0 &&
                    !sleepCardDone && (
                    <SleepCard
                      dayIndex={dayIndex}
                      hoursRemaining={dayState?.hours_remaining ?? 0}
                      onSleep={handleSleep}
                      onStayUp={handleStayUp}
                    />
                  )}

                  {/* End-of-day allocation — shown after all beats are resolved and dismissed */}
                  {USE_DAILY_LOOP_ORCHESTRATOR &&
                    chapterOneMode &&
                    awaitingAllocation &&
                    pendingDismissalBeats.length === 0 && (
                    <DaySummaryCard
                      dayIndex={dayIndex}
                      currentSegment={dayState?.current_segment ?? 'morning'}
                      hoursRemaining={dayState?.hours_remaining ?? 16}
                      hoursCommitted={dayState?.hours_committed ?? 0}
                      allocation={allocation}
                      totalAllocation={totalAllocation}
                      allocationValid={allocationValid}
                      savingAllocation={savingAllocation}
                      onAllocationChange={handleAllocationChange}
                      onSave={handleSaveAllocation}
                      resourcesEnabled={featureFlags.resources}
                    />
                  )}

              {USE_DAILY_LOOP_ORCHESTRATOR && stage === "reflection" && chapterOneReflectionReady ? (
                <section className="space-y-3">
                  <ChapterOneReflection
                    summaryLines={chapterOneReflectionLines}
                    prompt={buildReplayPrompt()}
                    submitting={chapterOneReflectionSaving}
                    onSelect={handleChapterOneReplayIntention}
                  />
                  <TesterOnly>
                    <TesterFeedback
                      dayIndex={dayIndex}
                      context={{
                        lifePressureState: chapterOneState?.lifePressureState,
                        energyLevel: chapterOneState?.energyLevel,
                        moneyBand: chapterOneState?.moneyBand,
                        skillFlags: chapterOneState?.skillFlags,
                        npcMemory: chapterOneState?.npcMemory,
                        replayIntention: chapterOneState?.replayIntention,
                        expiredOpportunities: chapterOneState?.expiredOpportunities,
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
                <section className="space-y-3 rounded border-2 border-accent-foreground/20 bg-accent px-4 py-4">
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
                  skills={skills}
                  resourcesEnabled={featureFlags.resources}
                  skillsEnabled={skillUiEnabled}
                  scarcityMode={chapterOneMode && !featureFlags.resources}
                  energyLevel={chapterOneState?.energyLevel}
                  onResourcesHoverStart={() => startHover("resources_panel")}
                  onResourcesHoverEnd={() => endHover("resources_panel")}
                  onVectorsHoverStart={() => startHover("vectors_panel")}
                  onVectorsHoverEnd={() => endHover("vectors_panel")}
                  onSkillWebOpen={() => setSkillWebOpen(true)}
                />
                <SkillWebPanel
                  skills={skillWebState.skills}
                  composites={skillWebState.composites}
                  open={skillWebOpen}
                  onClose={() => setSkillWebOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
  );
}
