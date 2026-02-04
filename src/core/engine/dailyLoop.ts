import { ensureCadenceUpToDate } from "@/lib/cadence";
import {
  fetchDailyState,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  fetchRecentStoryletRuns,
} from "@/lib/play";
import { hasSentBoostToday } from "@/lib/social";
import { getReflection, isReflectionDone } from "@/lib/reflections";
import { fetchMicroTaskRun } from "@/lib/microtasks";
import { fallbackStorylet } from "@/core/validation/storyletValidation";
import { selectStorylets } from "@/core/storylets/selectStorylets";
import { getArcNextStepStorylet, getOrStartArc } from "@/core/arcs/arcEngine";
import { performSeasonReset } from "@/core/season/seasonReset";
import { getSeasonContext } from "@/core/season/getSeasonContext";
import { shouldShowFunPulse } from "@/core/funPulse/shouldShowFunPulse";
import { getFunPulse } from "@/lib/funPulse";
import { isMicrotaskEligible } from "@/core/experiments/microtaskRule";
import { buildStoryletContext } from "@/core/engine/storyletContext";
import { ensureUserInCohort } from "@/lib/cohorts";
import { fetchArcByKey as fetchContentArcByKey, listActiveArcs } from "@/lib/content/arcs";
import { listActiveInitiativesCatalog } from "@/lib/content/initiatives";
import {
  fetchArcCurrentStepContent,
  fetchArcInstance,
  fetchArcInstancesByKeys,
} from "@/lib/arcs";
import { listFactions } from "@/lib/factions";
import {
  ensureUserAlignmentRows,
  fetchRecentAlignmentEvents,
  fetchUserAlignment,
  hasAlignmentEvent,
  applyAlignmentDelta,
} from "@/lib/alignment";
import {
  fetchStaleDirectiveForCohort,
  getOrCreateWeeklyDirective,
  updateDirectiveStatus,
} from "@/lib/directives";
import { computeUnlockedContent } from "@/lib/unlocks";
import {
  fetchInitiativeProgress,
  fetchOpenInitiativesForCohort,
  fetchUserContributionStatus,
  fetchInitiativeForWeek,
  getOrCreateWeeklyInitiative,
  closeInitiative,
} from "@/lib/initiatives";
import {
  computeWeekWindow,
  getOrComputeCohortWeeklyInfluence,
  getOrComputeWeeklySnapshot,
  getOrComputeWorldWeeklyInfluence,
} from "@/lib/worldState";
import {
  ensureSkillBankUpToDate,
  ensureTensionsUpToDate,
  fetchSkillAllocations,
  fetchSkillLevels,
  fetchPosture,
  fetchSkillBank,
  fetchTensions,
} from "@/lib/dailyInteractions";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { skillCostForLevel } from "@/core/sim/skillProgression";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
} from "@/types/dailyInteraction";
import type { Storylet, StoryletRun } from "@/types/storylets";

const ARC_KEY = "anomaly_001";
const DIRECTIVE_TAGS: Record<string, string[]> = {
  neo_assyrian: ["work", "cash", "leverage"],
  dynastic_consortium: ["study", "research", "tech"],
  templar_remnant: ["duty", "faith", "order"],
  bormann_network: ["security", "secrecy", "force"],
};

function runsForTodayPair(runs: StoryletRun[], storyletPair: Storylet[]): StoryletRun[] {
  const ids = new Set(storyletPair.map((s) => s.id));
  return runs.filter((run) => ids.has(run.storylet_id));
}

function computeStage(
  allocationPresent: boolean,
  runsForPairCount: number,
  alreadyCompletedToday: boolean,
  canBoost: boolean,
  hasStorylets: boolean,
  reflectionDone: boolean,
  microTaskEligible: boolean,
  microTaskDone: boolean,
  funPulseEligible: boolean,
  funPulseDone: boolean
): DailyRunStage {
  if (!hasStorylets) return "complete";
  if (alreadyCompletedToday) return "complete";
  if (!allocationPresent) return "allocation";
  if (runsForPairCount === 0) return "storylet_1";
  if (runsForPairCount === 1) return "storylet_2";
  if (runsForPairCount >= 2 && reflectionDone && funPulseEligible && !funPulseDone) {
    return "fun_pulse";
  }
  if (runsForPairCount >= 2 && reflectionDone) return "complete";
  if (runsForPairCount >= 2 && microTaskEligible && !microTaskDone) return "microtask";
  if (runsForPairCount >= 2 && canBoost) return "social";
  if (runsForPairCount >= 2 && !canBoost) return "reflection";
  return "complete";
}

function devLogStage(snapshot: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[daily-run]", snapshot);
  }
}

function needsSetup({
  skillBank,
  posture,
  skillLevels,
}: {
  skillBank: SkillBank | null;
  posture: DailyPosture | null;
  skillLevels: { focus: number; memory: number; networking: number; grit: number } | null;
}) {
  if (skillBank && skillBank.available_points > 0) {
    const levels = skillLevels ?? {
      focus: 0,
      memory: 0,
      networking: 0,
      grit: 0,
    };
    const minCost = Math.min(
      skillCostForLevel(levels.focus + 1),
      skillCostForLevel(levels.memory + 1),
      skillCostForLevel(levels.networking + 1),
      skillCostForLevel(levels.grit + 1)
    );
    if (skillBank.available_points >= minCost) {
      return true;
    }
  }
  if (!posture) return true;
  return false;
}

export async function getOrCreateDailyRun(
  userId: string,
  today: Date,
  options?: {
    microtaskVariant?: string;
    experiments?: Record<string, string>;
    isAdmin?: boolean;
  }
): Promise<DailyRun> {
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);

  const seasonContext = await getSeasonContext(userId, today);
  const currentSeasonIndex = seasonContext.currentSeason.season_index;
  const userSeason = seasonContext.userSeason;
  let seasonResetNeeded = false;
  let seasonRecap = null;
  if (userSeason.current_season_index !== currentSeasonIndex) {
    seasonRecap = await performSeasonReset(userId, currentSeasonIndex, userSeason);
    seasonResetNeeded = true;
    seasonContext.userSeason = {
      ...userSeason,
      current_season_index: currentSeasonIndex,
      last_seen_season_index: currentSeasonIndex,
      last_reset_at: new Date().toISOString(),
      last_recap: seasonRecap ?? userSeason.last_recap,
    };
  }

  const cadence = await ensureCadenceUpToDate(userId);
  const dayIndex = cadence.dayIndex;

  await ensureSkillBankUpToDate(userId, dayIndex);
  await ensureTensionsUpToDate(userId, dayIndex);

  const [
    daily,
    dayState,
    allocation,
    runs,
    storyletsRaw,
    boosted,
    tensions,
    skillBank,
    posture,
    allocations,
    skills,
  ] = await Promise.all([
    fetchDailyState(userId),
    ensureDayStateUpToDate(userId, dayIndex).catch(() => null),
    fetchTimeAllocation(userId, dayIndex),
    fetchTodayRuns(userId, dayIndex),
    fetchTodayStoryletCandidates(seasonContext.currentSeason.season_index),
    hasSentBoostToday(userId, dayIndex),
    fetchTensions(userId, dayIndex),
    fetchSkillBank(userId),
    fetchPosture(userId, dayIndex),
    fetchSkillAllocations(userId, dayIndex),
    fetchSkillLevels(userId),
    // Note: we fetch recent history separately below.
  ]);

  let allocationSeed = null as DailyRun["allocationSeed"];
  if (!allocation && dayIndex > 0) {
    allocationSeed = await fetchTimeAllocation(userId, dayIndex - 1).catch(
      () => null
    );
  }

  const recentRuns =
    (await fetchRecentStoryletRuns(userId, dayIndex, 7).catch(() => [])) ?? [];

  const cohort = await ensureUserInCohort(userId).catch(() => null);
  const cohortId = cohort?.cohortId ?? null;

  await ensureUserAlignmentRows(userId);
  const [factions, alignmentRows, contentArcs, contentInitiatives, recentEvents] =
    await Promise.all([
      listFactions(),
      fetchUserAlignment(userId),
      listActiveArcs(),
      listActiveInitiativesCatalog(),
      fetchRecentAlignmentEvents(userId, dayIndex).catch(() => []),
    ]);
  const alignment = alignmentRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.faction_key] = row.score;
    return acc;
  }, {});
  const unlocks = computeUnlockedContent(alignment, contentArcs, contentInitiatives);
  const directive = cohortId
    ? await getOrCreateWeeklyDirective(
        cohortId,
        dayIndex,
        unlocks.unlockedInitiativeKeys
      ).catch(() => null)
    : null;
  const directiveTags =
    directive?.faction_key && DIRECTIVE_TAGS[directive.faction_key]
      ? DIRECTIVE_TAGS[directive.faction_key]
      : [];

  const userArc = await getOrStartArc(userId, dayIndex);
  const arcStorylet = getArcNextStepStorylet(
    userArc,
    dayIndex,
    storyletsRaw,
    runs
  );

  const storyletsSelected = selectStorylets({
    seed: `${userId}-${dayIndex}`,
    userId,
    dayIndex,
    seasonIndex: seasonContext.currentSeason.season_index,
    dailyState: daily ?? null,
    allStorylets: storyletsRaw,
    recentRuns,
    forcedStorylet: arcStorylet ?? undefined,
    experiments: options?.experiments,
    isAdmin: options?.isAdmin,
    context: buildStoryletContext({ posture, tensions, directiveTags }),
  });

  let initiatives = null as DailyRun["initiatives"];

  if (cohortId) {
    await getOrCreateWeeklyInitiative(cohortId, dayIndex, directive);
  }

  if (cohortId) {
    const staleDirective = await fetchStaleDirectiveForCohort(cohortId, dayIndex).catch(
      () => null
    );
    if (staleDirective) {
      const initiative = await fetchInitiativeForWeek(
        cohortId,
        staleDirective.week_start_day_index
      );
      if (initiative && initiative.status === "open" && dayIndex > initiative.ends_day_index) {
        const progress = await fetchInitiativeProgress(initiative.id);
        const nextStatus = progress >= initiative.goal ? "completed" : "expired";
        await closeInitiative(initiative.id);
        await updateDirectiveStatus(staleDirective.id, nextStatus);
        staleDirective.status = nextStatus;
      }

      if (staleDirective.status === "completed") {
        const alreadyRewarded = await hasAlignmentEvent({
          userId,
          source: "directive",
          sourceRef: staleDirective.id,
        }).catch(() => false);
        if (!alreadyRewarded) {
          await applyAlignmentDelta({
            userId,
            dayIndex,
            factionKey: staleDirective.faction_key,
            delta: 2,
            source: "directive",
            sourceRef: staleDirective.id,
          }).catch(() => {});
        }
      }
    }
  }

  if (cohortId) {
    const openInitiatives = await fetchOpenInitiativesForCohort(cohortId, dayIndex);
    const enriched = await Promise.all(
      openInitiatives.map(async (initiative) => {
        const [contributedToday, progress] = await Promise.all([
          fetchUserContributionStatus(initiative.id, userId, dayIndex),
          fetchInitiativeProgress(initiative.id),
        ]);
        return { ...initiative, contributedToday, progress };
      })
    );
    initiatives = enriched;
  }

  const arcDefinition = await fetchContentArcByKey(ARC_KEY);
  const arcInstance = arcDefinition ? await fetchArcInstance(userId, ARC_KEY) : null;
  const arcStep =
    arcDefinition && arcInstance?.status === "active"
      ? await fetchArcCurrentStepContent(ARC_KEY, arcInstance.current_step)
      : null;

  const reflection = await getReflection(userId, dayIndex);
  const reflectionDone = isReflectionDone(reflection);
  const funPulseEligible = shouldShowFunPulse(dayIndex, currentSeasonIndex);
  const funPulseRow = funPulseEligible
    ? await getFunPulse(userId, currentSeasonIndex, dayIndex)
    : null;
  const funPulseDone = Boolean(funPulseRow);
  const microTaskVariant = options?.microtaskVariant ?? "A";
  const microTaskEligible = isMicrotaskEligible(dayIndex, microTaskVariant);
  const microTaskRun = microTaskEligible
    ? await fetchMicroTaskRun(userId, dayIndex)
    : null;
  const microTaskStatus = microTaskRun
    ? microTaskRun.status === "completed"
      ? "done"
      : "skipped"
    : "pending";
  const microTaskDone = Boolean(microTaskRun);

  const storylets =
    storyletsSelected.length > 0
      ? storyletsSelected
      : [fallbackStorylet(), fallbackStorylet()];
  const hasStorylets = storylets.length > 0;
  const runsForPair = runsForTodayPair(runs, storylets);
  const canBoost = !boosted;
  const setupNeeded = needsSetup({ skillBank, posture, skillLevels: skills ?? null });
  const baseStage = computeStage(
    Boolean(allocation),
    runsForPair.length,
    cadence.alreadyCompletedToday,
    canBoost,
    hasStorylets,
    reflectionDone,
    microTaskEligible,
    microTaskDone,
    funPulseEligible,
    funPulseDone
  );
  const stage =
    !cadence.alreadyCompletedToday && setupNeeded ? "setup" : baseStage;

  devLogStage({
    dayIndex,
    hasAllocation: Boolean(allocation),
    runsForPair: runsForPair.length,
    canBoost,
    reflectionDone,
    microTaskEligible,
    microTaskDone,
    needsSetup: setupNeeded,
    stage,
  });

  const unlockedInstances = await fetchArcInstancesByKeys(
    userId,
    unlocks.unlockedArcKeys
  ).catch(() => []);
  const startedArcKeys = new Set(unlockedInstances.map((item) => item.arc_key));
  const availableArcs = contentArcs
    .filter((arc) => unlocks.unlockedArcKeys.includes(arc.key))
    .filter((arc) => !startedArcKeys.has(arc.key))
    .map((arc) => ({ key: arc.key, title: arc.title, description: arc.description }));

  const { weekStart, weekEnd } = computeWeekWindow(dayIndex);
  const worldInfluence = await getOrComputeWorldWeeklyInfluence(weekStart, weekEnd).catch(
    () => ({})
  );
  const cohortInfluence = cohortId
    ? await getOrComputeCohortWeeklyInfluence(cohortId, weekStart, weekEnd).catch(
        () => ({})
      )
    : null;
  const rivalrySnapshot = await getOrComputeWeeklySnapshot(weekStart, weekEnd).catch(
    () => ({ topCohorts: [] })
  );

  return {
    userId,
    dayIndex,
    date: todayUtc,
    stage,
    allocation: allocation ?? null,
    allocationSeed,
    storylets: hasStorylets ? storylets : [fallbackStorylet(), fallbackStorylet()],
    storyletRunsToday: runs,
    canBoost,
    tensions,
    skillBank,
    posture,
    allocations,
    skills,
    nextSkillUnlockDay: 2,
    cohortId,
    arc: arcDefinition
      ? {
          arc_key: arcDefinition.key,
          status:
            arcInstance?.status === "completed"
              ? "completed"
              : arcInstance?.status === "active"
                ? "active"
                : "not_started",
          title: arcDefinition.title,
          description: arcDefinition.description,
          current_step: arcInstance?.current_step ?? null,
          step: arcStep
            ? {
                step_index: arcStep.step_index,
                title: arcStep.title,
                body: arcStep.body,
                choices: arcStep.choices ?? [],
              }
            : null,
        }
      : null,
    factions,
    alignment,
    unlocks: {
      arcKeys: unlocks.unlockedArcKeys,
      initiativeKeys: unlocks.unlockedInitiativeKeys,
    },
    availableArcs,
    recentAlignmentEvents: recentEvents,
    worldState: {
      weekStart,
      weekEnd,
      influence: worldInfluence,
    },
    cohortState: cohortInfluence
      ? {
          weekStart,
          weekEnd,
          influence: cohortInfluence,
        }
      : null,
    rivalry: {
      topCohorts: rivalrySnapshot.topCohorts,
    },
    directive: directive
      ? {
          faction_key: directive.faction_key,
          title: directive.title,
          description: directive.description,
          target_type: directive.target_type,
          target_key: directive.target_key,
          week_end_day_index: directive.week_end_day_index,
          status: directive.status,
        }
      : null,
    initiatives,
    reflectionStatus: reflectionDone ? "done" : "pending",
    microTaskStatus,
    funPulseEligible,
    funPulseDone,
    dailyState: daily,
    dayState: dayState
      ? {
          energy: dayState.energy,
          stress: dayState.stress,
          cashOnHand: dayState.cashOnHand,
          knowledge: dayState.knowledge,
          socialLeverage: dayState.socialLeverage,
          physicalResilience: dayState.physicalResilience,
          total_study: dayState.total_study,
          total_work: dayState.total_work,
          total_social: dayState.total_social,
          total_health: dayState.total_health,
          total_fun: dayState.total_fun,
        }
      : null,
    seasonResetNeeded,
    newSeasonIndex: seasonResetNeeded ? currentSeasonIndex : undefined,
    seasonRecap: seasonResetNeeded ? seasonRecap : undefined,
    seasonContext,
  };
}

// Export helpers for testing
export const _testOnly = {
  runsForTodayPair,
  computeStage,
};
