"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatternMatchTask } from "@/components/microtasks/PatternMatchTask";
import { ConsequenceMoment } from "@/components/storylets/ConsequenceMoment";
import { FunPulse } from "@/components/FunPulse";
import { ArcPanel } from "@/components/play/ArcPanel";
import { FactionStatusPanel } from "@/components/play/FactionStatusPanel";
import { InitiativePanel } from "@/components/play/InitiativePanel";
import { DailySetupPanel } from "@/components/play/DailySetupPanel";
import { signOut } from "@/lib/auth";
import { ensureCadenceUpToDate } from "@/lib/cadence";
import { trackEvent } from "@/lib/events";
import { supabase } from "@/lib/supabase/browser";
import { getOrCreateDailyRun } from "@/core/engine/dailyLoop";
import { advanceArcIfStepCompleted } from "@/core/arcs/arcEngine";
import { PRIMARY_ARC_ID } from "@/content/arcs/arcDefinitions";
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
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  markDailyComplete,
  saveTimeAllocation,
  applyOutcomeForChoice,
  toChoices,
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
import { advanceArc, completeArc, startArc } from "@/lib/arcs";
import { contributeToInitiative } from "@/lib/initiatives";
import type { DailyRunStage } from "@/types/dailyRun";
import type {
  DailyPosture,
} from "@/types/dailyInteraction";
import type { ReflectionResponse } from "@/types/reflections";
import { AuthGate } from "@/ui/components/AuthGate";
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

const DevMenu = dynamic(() => import("./DevMenu"), { ssr: false });

const defaultAllocation: AllocationPayload = {
  study: 0,
  work: 0,
  social: 0,
  health: 0,
  fun: 0,
};

const USE_DAILY_LOOP_ORCHESTRATOR = true;

export default function PlayPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
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
    availableArcs,
    cohortId,
    arc,
    initiatives,
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
    setGameContent,
  } = useGameContent();
  const [arcSubmitting, setArcSubmitting] = useState(false);
  const [initiativeSubmitting, setInitiativeSubmitting] = useState(false);
  const [funPulseSaving, setFunPulseSaving] = useState(false);
  const [bootstrapAssignments, setBootstrapAssignments] = useState<
    Record<string, string>
  >({});
  const [bootstrapIsAdmin, setBootstrapIsAdmin] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapUserId, setBootstrapUserId] = useState<string | null>(null);
  const [bootstrapEmail, setBootstrapEmail] = useState<string | null>(null);
  const { assignments, getVariant, ready: experimentsReady } = useExperiments([
    "microtask_freq_v1",
  ], bootstrapAssignments);
  const microtaskVariant = getVariant("microtask_freq_v1", "A");
  const experiments = useMemo(() => assignments, [assignments]);
  const servedStoryletsRef = useRef<string | null>(null);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
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

  const gameNote = useMemo(
    () =>
      gameMessage("The day opens like a file you didn't finish yesterday.", {
        tone: "neutral",
      }),
    []
  );
  const testerMode = useMemo(() => getAppMode().testerMode, []);
  const testerNote = useMemo(
    () =>
      testerMessage("Tester: Set posture, allocate time, then pick a storylet.", {
        tone: "warning",
      }),
    []
  );
  const [testerIntroMessage, setTesterIntroMessage] =
    useState<ReturnType<typeof testerMessage> | null>(null);
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
    const loadBootstrap = async () => {
      setError(null);
      try {
        const sessionData = await supabase.auth.getSession();
        const token = sessionData.data.session?.access_token;
        if (!token) throw new Error("No session found.");
        const bootRes = await fetch("/api/bootstrap", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const bootJson = await bootRes.json();
        if (!bootRes.ok) {
          throw new Error(bootJson.error ?? "Failed to load bootstrap.");
        }
        setUserId(bootJson.userId);
        setBootstrapUserId(bootJson.userId);
        setBootstrapEmail(bootJson.email ?? null);
        setBootstrapAssignments(bootJson.experiments ?? {});
        setBootstrapIsAdmin(Boolean(bootJson.isAdmin));
        setBootstrapReady(true);
      } catch (e) {
        console.error(e);
        setError("Failed to load play state.");
      }
    };

    loadBootstrap();
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!bootstrapReady || !bootstrapUserId) return;
      if (!experimentsReady) return;
      setLoading(true);
      setError(null);
      try {
        const isAdmin =
          isEmailAllowed(bootstrapEmail) || devIsAdmin || bootstrapIsAdmin;

        if (USE_DAILY_LOOP_ORCHESTRATOR) {
          const run = await getOrCreateDailyRun(bootstrapUserId, new Date(), {
            microtaskVariant,
            experiments,
            isAdmin,
          });
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
            arc: run.arc ?? null,
            initiatives: run.initiatives ?? [],
            factions: run.factions ?? [],
            alignment: run.alignment ?? {},
            directive: run.directive ?? null,
            recentAlignmentEvents: run.recentAlignmentEvents ?? [],
            worldState: run.worldState ?? null,
            cohortState: run.cohortState ?? null,
            rivalry: run.rivalry ?? null,
            availableArcs: run.availableArcs ?? [],
            cohortId: run.cohortId ?? null,
          });
          setUserSocial({ hasSentBoost: !run.canBoost });
          const ds =
            run.dailyState ?? (await fetchDailyState(bootstrapUserId));
          if (ds) {
            setDailyState({ ...ds, day_index: run.dayIndex });
            if (!run.dayState) {
              setDayState({
                energy: ds.energy,
                stress: ds.stress,
                money: 0,
                study_progress: 0,
                social_capital: 0,
                health: 50,
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
              money: 0,
              study_progress: 0,
              social_capital: 0,
              health: 50,
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
          const next = candidates.filter((c) => !used.has(c.id)).slice(0, 2);
          setStorylets(next);

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
    microtaskVariant,
    experiments,
    devIsAdmin,
    bootstrapEmail,
    bootstrapIsAdmin,
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
    trackEvent({
      ...params,
      payload: {
        ...(params.payload ?? {}),
        ...(seasonIndexValue ? { season_index: seasonIndexValue } : {}),
      },
    });
  };

  useEffect(() => {
    if (!userId || loading || sessionStartTracked.current) return;
    sessionStartTracked.current = true;
    trackWithSeason({ event_type: "session_start", day_index: dayIndex, stage });
  }, [userId, dayIndex, stage, loading, seasonContext]);

  useEffect(() => {
    if (!userId || loading) return;
    const now = Date.now();
    const previousStage = stageRef.current;

    if (!previousStage) {
      stageRef.current = stage;
      stageStartedAtRef.current = now;
      trackWithSeason({ event_type: "stage_enter", day_index: dayIndex, stage });
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
    }

    stageRef.current = stage;
    stageStartedAtRef.current = now;
    trackWithSeason({ event_type: "stage_enter", day_index: dayIndex, stage });

    if (stage === "complete" && !sessionEndTracked.current) {
      sessionEndTracked.current = true;
      trackWithSeason({ event_type: "session_end", day_index: dayIndex, stage });
    }
  }, [stage, userId, dayIndex, loading]);

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
    if (testerIntroMessage) return;
    try {
      const seen = localStorage.getItem("mmv_tester_intro_seen");
      if (seen === "1") return;
      const intro = testerMessage(
        "You’re testing an early slice of MMV: a daily-life time-loop in a slightly-wrong version of college. Your job is to push on the system and tell us what feels clear, confusing, or pointless.",
        {
          title: "Welcome to the MMV Playtest",
          details:
            "• Posture + allocation changes Energy/Stress now and carries into tomorrow. • Threads (Arcs) are short narrative investigations. • After Day 2, skill points start and get harder over time. • Start here: begin “Anomaly 001” in the Threads panel.",
          tone: "warning",
        }
      );
      setTesterIntroMessage(intro);
      localStorage.setItem("mmv_tester_intro_seen", "1");
    } catch {}
  }, [testerMode, testerIntroMessage]);

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
  const choicesDisabled = savingChoice || consequenceActive;
  const STUDY_TENSION_THRESHOLD = 40;
  const HEALTH_TENSION_THRESHOLD = 30;

  const handleAllocationChange = (key: keyof AllocationPayload, value: number) => {
    setAllocation({ ...allocation, [key]: value });
  };

  const handleSaveAllocation = async () => {
    if (!userId || !allocationValid) return;
    setSavingAllocation(true);
    setError(null);
    pendingDeltaSourceRef.current = "allocation";
    try {
      await saveTimeAllocation(userId, dayIndex, allocation, posture?.posture ?? null);
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
            money: 0,
            study_progress: 0,
            social_capital: 0,
            health: 50,
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

  const currentStorylet =
    stage === "storylet_1"
      ? storylets[0]
      : stage === "storylet_2"
      ? storylets[1]
      : storylets[currentIndex];

  const handleChoice = async (choiceId: string) => {
    if (!userId || !currentStorylet) return;
    setSavingChoice(true);
    setError(null);
    setOutcomeMessage(null);
    setOutcomeDeltas(null);
    setLastCheck(null);
    try {
      const runId = await createStoryletRun(
        userId,
        currentStorylet.id,
        dayIndex,
        choiceId
      );

      const alreadyRecorded = Boolean(runId);
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
              skills: skills ?? undefined,
            }
          );
        setDailyState(nextDailyState);
        const hasVectorDeltas =
          appliedDeltas.vectors &&
          Object.keys(appliedDeltas.vectors).length > 0;
        const hasDeltas =
          typeof appliedDeltas.energy === "number" ||
          typeof appliedDeltas.stress === "number" ||
          hasVectorDeltas;
        setOutcomeMessage(
          appliedMessage || (hasDeltas ? "Choice recorded." : null)
        );
        setOutcomeDeltas(hasDeltas ? appliedDeltas : null);
        if (resolvedCheck) {
          setLastCheck(resolvedCheck);
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
        const arcAdvance = await advanceArcIfStepCompleted(
          userId,
          PRIMARY_ARC_ID,
          dayIndex,
          currentStorylet.slug
        );
        if (arcAdvance?.nextDailyState) {
          setDailyState(arcAdvance.nextDailyState);
        }
        if (arcAdvance?.appliedDeltas) {
          setOutcomeDeltas((prev) => {
            const merged = {
              energy: prev?.energy,
              stress: prev?.stress,
            } as {
              energy?: number;
              stress?: number;
              vectors?: Record<string, number>;
            };
            merged.vectors = { ...(prev?.vectors ?? {}) };
            if (typeof arcAdvance.appliedDeltas?.stress === "number") {
              merged.stress = (merged.stress ?? 0) + arcAdvance.appliedDeltas.stress;
            }
            if (arcAdvance.appliedDeltas?.vectors) {
              for (const [key, delta] of Object.entries(
                arcAdvance.appliedDeltas.vectors
              )) {
                merged.vectors[key] = (merged.vectors[key] ?? 0) + delta;
              }
            }
            return merged;
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

      if (USE_DAILY_LOOP_ORCHESTRATOR) {
        let nextStage: DailyRunStage;
        if (stage === "storylet_1") {
          nextStage = "storylet_2";
        } else {
          nextStage =
            microTaskEligible && microTaskStatus === "pending"
              ? "microtask"
              : hasSentBoost
              ? "reflection"
              : "social";
        }
        pendingTransitionRef.current = () => setStage(nextStage);
        setConsequenceActive(true);
      } else {
        pendingTransitionRef.current = () => setCurrentIndex((i) => i + 1);
        setConsequenceActive(true);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to record choice.");
    } finally {
      setSavingChoice(false);
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
      await allocateSkillPoint({ userId, dayIndex, skillKey });
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

  const handleStartArc = async () => {
    if (!userId || !arc) return;
    setArcSubmitting(true);
    setError(null);
    try {
      await startArc(userId, arc.arc_key, dayIndex);
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start arc.");
    } finally {
      setArcSubmitting(false);
    }
  };

  const handleAdvanceArc = async (nextStep: number, complete: boolean) => {
    if (!userId || !arc) return;
    setArcSubmitting(true);
    setError(null);
    try {
      if (complete) {
        await completeArc(userId, arc.arc_key);
      } else {
        await advanceArc(userId, arc.arc_key, nextStep);
      }
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to advance arc.");
    } finally {
      setArcSubmitting(false);
    }
  };

  const handleBeginUnlockedArc = async (arcKey: string) => {
    if (!userId) return;
    setArcSubmitting(true);
    setError(null);
    try {
      await startArc(userId, arcKey, dayIndex);
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start arc.");
    } finally {
      setArcSubmitting(false);
    }
  };

  const handleContributeInitiative = async (initiativeId: string) => {
    if (!userId) return;
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
    <AuthGate>
      {(session) => (
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
                <MessageCard message={gameNote} variant="inline" />
                <TesterOnly>
                  <MessageCard message={testerNote} variant="inline" />
                </TesterOnly>
                {testerIntroMessage ? (
                  <TesterOnly>
                    <MessageCard message={testerIntroMessage} variant="inline" />
                  </TesterOnly>
                ) : null}
                {testerDeltaMessage ? (
                  <TesterOnly>
                    <MessageCard message={testerDeltaMessage} variant="inline" />
                  </TesterOnly>
                ) : null}
              </div>
              {dayRolloverNotice ? (
                <p className="mt-2 text-xs text-slate-500">{dayRolloverNotice}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Link className="text-sm text-slate-600 hover:underline" href="/journal">
                Journal
              </Link>
              <Link className="text-sm text-slate-600 hover:underline" href="/theory">
                Theoryboard
              </Link>
              <Link className="text-sm text-slate-600 hover:underline" href="/group">
                Group
              </Link>
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
              <Button onClick={signOut}>Sign out</Button>
            </div>
          </div>

          {showDevMenu ? (
            <DevMenu
              devSettings={devSettings}
              devSettingsLoading={devSettingsLoading}
              devSettingsSaving={devSettingsSaving}
              devLoading={devLoading}
              devError={devError}
              devCharacters={devCharacters}
              advancingUserId={advancingUserId}
              resettingUserId={resettingUserId}
              togglingAdminId={togglingAdminId}
              onToggleTestMode={handleToggleTestMode}
              onFastForward={handleFastForward}
              onClose={() => setShowDevMenu(false)}
              onAdvanceDay={handleAdvanceDay}
              onResetAccount={handleResetAccount}
              onToggleAdmin={handleToggleAdmin}
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
                  <p className="text-slate-700">Loading…</p>
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
                  {USE_DAILY_LOOP_ORCHESTRATOR && stage === "setup" && (
                    <section className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                      <DailySetupPanel
                        tensions={tensions}
                        skillBank={skillBank}
                        posture={posture}
                        dayIndex={dayIndex}
                        allocations={skillAllocations}
                        skills={skills ?? undefined}
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
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Step 1: Time Allocation</h2>
                        <span className="text-sm text-slate-600">
                          Total must equal 100 (current: {totalAllocation})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.keys(allocation).map((key) => (
                          <label
                            key={key}
                            className="flex flex-col gap-1 text-sm text-slate-700"
                          >
                            <span className="capitalize">{key}</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                              value={allocation[key as keyof AllocationPayload]}
                              onChange={(e) =>
                                handleAllocationChange(
                                  key as keyof AllocationPayload,
                                  Number(e.target.value)
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <Button
                        onClick={handleSaveAllocation}
                        disabled={!allocationValid || savingAllocation}
                      >
                        {savingAllocation ? "Saving..." : "Save allocation"}
                      </Button>
                    </section>
                  )}

                  {(stage === "storylet_1" ||
                    stage === "storylet_2" ||
                    (!USE_DAILY_LOOP_ORCHESTRATOR && allocationSaved)) && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Step 2: Storylets</h2>
                        <span className="text-sm text-slate-600">
                          Progress: {Math.min(runs.length, 2)}/2
                        </span>
                      </div>

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
                              Storylet {stage === "storylet_2" ? 2 : 1} of 2
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
                            {(outcomeMessage || outcomeDeltas) && !consequenceActive && (
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                {outcomeMessage ? <p>{outcomeMessage}</p> : null}
                                {outcomeDeltas ? (
                                  <ul className="mt-1 space-y-0.5 text-slate-700">
                                    {typeof outcomeDeltas.energy === "number" ? (
                                      <li>
                                        Energy {outcomeDeltas.energy >= 0 ? "+" : ""}
                                        {outcomeDeltas.energy}
                                      </li>
                                    ) : null}
                                    {typeof outcomeDeltas.stress === "number" ? (
                                      <li>
                                        Stress {outcomeDeltas.stress >= 0 ? "+" : ""}
                                        {outcomeDeltas.stress}
                                      </li>
                                    ) : null}
                                    {outcomeDeltas.vectors
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
                    arc &&
                    stage !== "setup" &&
                    stage !== "allocation" &&
                    stage !== "storylet_1" &&
                    stage !== "storylet_2" && (
                      <section className="space-y-3">
                        <ArcPanel
                          arc={arc}
                          availableArcs={availableArcs}
                          submitting={arcSubmitting}
                          onStart={handleStartArc}
                          onAdvance={handleAdvanceArc}
                          onBeginUnlocked={handleBeginUnlockedArc}
                        />
                      </section>
                    )}

                  {USE_DAILY_LOOP_ORCHESTRATOR && factions.length > 0 && (
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
                      {initiatives.length > 0 ? (
                        <InitiativePanel
                          initiative={initiatives[0]}
                          dayIndex={dayIndex}
                          directive={directive}
                          factions={factions}
                          submitting={initiativeSubmitting}
                          onContribute={() =>
                            handleContributeInitiative(initiatives[0].id)
                          }
                        />
                      ) : null}
                    </section>
                  )}

              {USE_DAILY_LOOP_ORCHESTRATOR && stage === "reflection" && (
                <section className="space-y-3 rounded-md border border-purple-200 bg-stone-50 px-4 py-4">
                  <h2 className="text-xl font-semibold">Reflection</h2>
                  <p className="text-slate-500 italic">
                    Did you know what to do today?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={reflectionSaving}
                      onClick={() => handleReflection("yes")}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      disabled={reflectionSaving}
                      onClick={() => handleReflection("mostly")}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      Mostly
                    </Button>
                    <Button
                      variant="outline"
                      disabled={reflectionSaving}
                      onClick={() => handleReflection("no")}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      No
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    disabled={reflectionSaving}
                    onClick={() => handleReflection("skip")}
                    className="border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    Skip for today
                  </Button>
                  <p className="text-sm text-slate-600">
                    Thanks — see you tomorrow.
                  </p>
                </section>
              )}
              {USE_DAILY_LOOP_ORCHESTRATOR && stage === "fun_pulse" && (
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
                allocation={allocationSummary}
                skillBank={skillBank}
                lastAppliedDeltas={outcomeDeltas}
                boostsReceivedCount={boostsReceived.length}
                skills={skills}
              />
            </div>
          </div>
          )}
        </div>
      )}
    </AuthGate>
  );
}
