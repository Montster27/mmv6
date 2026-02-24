import { ensureCadenceUpToDate } from "@/lib/cadence";
import { runsForTodayPair, computeStage } from "@/core/engine/dailyLoop.utils";
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
  startArc,
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
  upsertPosture,
} from "@/lib/dailyInteractions";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getArcOneState } from "@/core/arcOne/state";
import { ARC_ONE_LAST_DAY } from "@/core/arcOne/constants";
import {
  applyRemnantEffectForDay,
  fetchActiveRemnant,
  fetchUnlockedRemnants,
  getRemnantDefinition,
  listRemnantDefinitions,
} from "@/lib/remnants";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type { RemnantKey } from "@/types/remnants";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
} from "@/types/dailyInteraction";
import type { Storylet, StoryletRun } from "@/types/storylets";

const ARC_KEY = "intro_phone_on_hall";
const DIRECTIVE_TAGS: Record<string, string[]> = {
  neo_assyrian: ["work", "cash", "leverage"],
  dynastic_consortium: ["study", "research", "tech"],
  templar_remnant: ["duty", "faith", "order"],
  bormann_network: ["security", "secrecy", "force"],
};


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
  // auto-default posture for user test build (can be reverted)
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

  const featureFlags = getFeatureFlags();
  if (featureFlags.skills) {
    await ensureSkillBankUpToDate(userId, dayIndex);
  }
  await ensureTensionsUpToDate(userId, dayIndex);

  const [
    daily,
    dayStateRaw,
    allocation,
    runs,
    storyletsRaw,
    boosted,
    tensions,
    skillBankRaw,
    postureRaw,
    allocationsRaw,
    skillsRaw,
  ] = await Promise.all([
    fetchDailyState(userId),
    ensureDayStateUpToDate(userId, dayIndex).catch(() => null),
    fetchTimeAllocation(userId, dayIndex),
    fetchTodayRuns(userId, dayIndex),
    fetchTodayStoryletCandidates(seasonContext.currentSeason.season_index),
    hasSentBoostToday(userId, dayIndex),
    fetchTensions(userId, dayIndex),
    featureFlags.skills ? fetchSkillBank(userId) : Promise.resolve(null),
    fetchPosture(userId, dayIndex),
    featureFlags.skills ? fetchSkillAllocations(userId, dayIndex) : Promise.resolve([]),
    featureFlags.skills ? fetchSkillLevels(userId) : Promise.resolve(null),
    // Note: we fetch recent history separately below.
  ]);
  let dayState = dayStateRaw;
  const skillBank = featureFlags.skills ? skillBankRaw : null;
  const allocations = featureFlags.skills ? allocationsRaw : [];
  const skills = featureFlags.skills ? skillsRaw : null;
  let postureResolved = postureRaw;
  if (!postureResolved) {
    // auto-default posture for user test build (can be reverted)
    const createdAt = new Date().toISOString();
    try {
      await upsertPosture({
        user_id: userId,
        day_index: dayIndex,
        posture: "steady",
        created_at: createdAt,
      });
    } catch (error) {
      console.error("Failed to auto-default posture", error);
    }
    postureResolved = {
      user_id: userId,
      day_index: dayIndex,
      posture: "steady",
      created_at: createdAt,
    };
  }

  const [allocationSeed, recentRuns, cohort] = await Promise.all([
    !allocation && dayIndex > 0
      ? fetchTimeAllocation(userId, dayIndex - 1).catch(() => null)
      : Promise.resolve(null),
    fetchRecentStoryletRuns(userId, dayIndex, 7).catch(() => []),
    ensureUserInCohort(userId).catch(() => null),
  ]);
  const cohortId = cohort?.cohortId ?? null;

  let remnantState: DailyRun["remnant"] = null;
  if (featureFlags.remnantSystemEnabled) {
    const [unlockedKeys, activeSelection] = await Promise.all([
      fetchUnlockedRemnants(userId).catch(() => [] as RemnantKey[]),
      fetchActiveRemnant(userId).catch(() => null),
    ]);
    const unlockedDefs = listRemnantDefinitions().filter((remnant) =>
      unlockedKeys.includes(remnant.key)
    );
    const activeDef = activeSelection?.remnant_key
      ? getRemnantDefinition(activeSelection.remnant_key)
      : null;
    let applied = false;
    if (dayState) {
      const appliedResult = await applyRemnantEffectForDay({
        userId,
        dayIndex,
        dayState,
      });
      applied = appliedResult.applied;
      if (appliedResult.dayState) {
        dayState = appliedResult.dayState;
      }
    }
    remnantState = {
      unlocked: unlockedDefs,
      active: activeDef ?? null,
      applied,
    };
  }

  let factions: DailyRun["factions"] = [];
  let alignment = {} as Record<string, number>;
  let contentArcs = [] as Awaited<ReturnType<typeof listActiveArcs>>;
  let contentInitiatives = [] as Awaited<ReturnType<typeof listActiveInitiativesCatalog>>;
  let recentEvents = [] as DailyRun["recentAlignmentEvents"];
  let unlocks: ReturnType<typeof computeUnlockedContent> = {
    unlockedArcKeys: [],
    unlockedInitiativeKeys: [],
  };
  let directiveRow = null as Awaited<ReturnType<typeof getOrCreateWeeklyDirective>> | null;
  let directiveSummary = null as DailyRun["directive"];
  const initiativesEnabled = featureFlags.alignment;

  if (featureFlags.alignment) {
    const [alignmentRows, factionsResult, arcsResult, initiativesResult, events] =
      await Promise.all([
        (async () => {
          await ensureUserAlignmentRows(userId).catch(() => { });
          return fetchUserAlignment(userId);
        })(),
        listFactions(),
        listActiveArcs(),
        listActiveInitiativesCatalog(),
        fetchRecentAlignmentEvents(userId, dayIndex).catch(() => []),
      ]);
    factions = factionsResult;
    contentArcs = arcsResult;
    contentInitiatives = initiativesResult;
    recentEvents = events;
    alignment = alignmentRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.faction_key] = row.score;
      return acc;
    }, {});
    unlocks = computeUnlockedContent(alignment, contentArcs, contentInitiatives);
    directiveRow = cohortId
      ? await getOrCreateWeeklyDirective(
        cohortId,
        dayIndex,
        unlocks.unlockedInitiativeKeys
      ).catch(() => null)
      : null;
    directiveSummary = directiveRow
      ? {
        faction_key: directiveRow.faction_key,
        title: directiveRow.title,
        description: directiveRow.description,
        target_type: directiveRow.target_type,
        target_key: directiveRow.target_key,
        week_end_day_index: directiveRow.week_end_day_index,
        status: directiveRow.status,
      }
      : null;
  }
  const directiveTags =
    directiveRow?.faction_key && DIRECTIVE_TAGS[directiveRow.faction_key]
      ? DIRECTIVE_TAGS[directiveRow.faction_key]
      : [];

  const userArc = featureFlags.arcs ? await getOrStartArc(userId, dayIndex) : null;
  const arcStorylet =
    featureFlags.arcs && userArc
      ? getArcNextStepStorylet(userArc, dayIndex, storyletsRaw, runs)
      : null;

  const storyletsSelected = featureFlags.arcFirstEnabled
    ? []
    : selectStorylets({
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
        context: buildStoryletContext({
          posture: postureResolved,
          tensions,
          directiveTags,
        }),
      });

  let initiatives = null as DailyRun["initiatives"];

  if (cohortId && initiativesEnabled) {
    await getOrCreateWeeklyInitiative(cohortId, dayIndex, directiveRow);
  }

  if (cohortId && initiativesEnabled) {
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
          }).catch(() => { });
        }
      }
    }
  }

  if (cohortId && initiativesEnabled) {
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

  const arcDefinition = featureFlags.arcs
    ? await fetchContentArcByKey(ARC_KEY)
    : null;
  let arcInstance =
    featureFlags.arcs && arcDefinition ? await fetchArcInstance(userId, ARC_KEY) : null;
  if (featureFlags.arcs && arcDefinition && !arcInstance && dayIndex >= 1) {
    arcInstance = await startArc(userId, ARC_KEY, dayIndex);
  }
  const arcStep =
    featureFlags.arcs && arcDefinition && arcInstance?.status === "active"
      ? await fetchArcCurrentStepContent(ARC_KEY, arcInstance.current_step)
      : null;

  const reflection = await getReflection(userId, dayIndex);
  const reflectionDone = isReflectionDone(reflection);
  const funPulseEligible = featureFlags.funPulse
    ? shouldShowFunPulse(dayIndex, currentSeasonIndex)
    : false;
  const funPulseRow =
    funPulseEligible && featureFlags.funPulse
      ? await getFunPulse(userId, currentSeasonIndex, dayIndex)
      : null;
  const funPulseDone = featureFlags.funPulse ? Boolean(funPulseRow) : false;
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

  const storylets = featureFlags.arcFirstEnabled
    ? []
    : storyletsSelected.length > 0
    ? storyletsSelected
    : [fallbackStorylet(), fallbackStorylet()];
  const hasStorylets = storylets.length > 0;
  const runsForPair = runsForTodayPair(runs, storylets);
  const canBoost = !boosted;
  const arcOneMode =
    featureFlags.arcOneScarcityEnabled &&
    featureFlags.arcFirstEnabled &&
    dayIndex <= ARC_ONE_LAST_DAY;
  const setupNeeded = needsSetup({
    skillBank: arcOneMode ? null : skillBank,
    posture: postureResolved,
    skillLevels: skills ?? null,
  });
  const baseStage = computeStage(
    arcOneMode ? true : Boolean(allocation),
    runsForPair.length,
    cadence.alreadyCompletedToday,
    canBoost,
    hasStorylets,
    featureFlags.arcFirstEnabled,
    reflectionDone,
    microTaskEligible,
    microTaskDone,
    funPulseEligible,
    funPulseDone
  );
  const stage =
    !cadence.alreadyCompletedToday && setupNeeded ? "setup" : baseStage;

  const arcOneState = arcOneMode ? getArcOneState(daily ?? null) : null;

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

  const availableArcs = featureFlags.alignment
    ? await fetchArcInstancesByKeys(userId, unlocks.unlockedArcKeys)
      .catch(() => [])
      .then((unlockedInstances) => {
        const startedArcKeys = new Set(
          unlockedInstances.map((item) => item.arc_key)
        );
        return contentArcs
          .filter((arc) => unlocks.unlockedArcKeys.includes(arc.key))
          .filter((arc) => !startedArcKeys.has(arc.key))
          .map((arc) => ({
            key: arc.key,
            title: arc.title,
            description: arc.description,
          }));
      })
    : [];

  const { weekStart, weekEnd } = computeWeekWindow(dayIndex);
  const [worldInfluence, cohortInfluence, rivalrySnapshot] = await Promise.all([
    featureFlags.alignment
      ? getOrComputeWorldWeeklyInfluence(weekStart, weekEnd).catch(() => ({}))
      : Promise.resolve(null),
    featureFlags.alignment && cohortId
      ? getOrComputeCohortWeeklyInfluence(cohortId, weekStart, weekEnd).catch(
        () => ({})
      )
      : Promise.resolve(null),
    featureFlags.alignment
      ? getOrComputeWeeklySnapshot(weekStart, weekEnd).catch(
        () => ({ topCohorts: [] })
      )
      : Promise.resolve({ topCohorts: [] }),
  ]);

  return {
    userId,
    dayIndex,
    date: todayUtc,
    stage,
    allocation: allocation ?? null,
    allocationSeed,
    storylets: featureFlags.arcFirstEnabled
      ? []
      : hasStorylets
      ? storylets
      : [fallbackStorylet(), fallbackStorylet()],
    storyletRunsToday: featureFlags.arcFirstEnabled ? [] : runs,
    canBoost,
    tensions,
    skillBank: featureFlags.skills ? skillBank : null,
    posture: postureResolved,
    allocations: featureFlags.skills ? allocations : [],
    skills: featureFlags.skills ? skills ?? undefined : undefined,
    nextSkillUnlockDay: featureFlags.skills ? 2 : undefined,
    cohortId,
    arc: featureFlags.arcs && arcDefinition
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
    factions: featureFlags.alignment ? factions : [],
    alignment: featureFlags.alignment ? alignment : undefined,
    unlocks: featureFlags.alignment
      ? {
        arcKeys: unlocks.unlockedArcKeys,
        initiativeKeys: unlocks.unlockedInitiativeKeys,
      }
      : undefined,
    availableArcs: featureFlags.alignment ? availableArcs : [],
    recentAlignmentEvents: featureFlags.alignment ? recentEvents : undefined,
    worldState: featureFlags.alignment
      ? {
        weekStart,
        weekEnd,
        influence: worldInfluence ?? {},
      }
      : undefined,
    cohortState:
      featureFlags.alignment && cohortInfluence
        ? {
          weekStart,
          weekEnd,
          influence: cohortInfluence,
        }
        : null,
    rivalry: featureFlags.alignment
      ? {
        topCohorts: rivalrySnapshot.topCohorts,
      }
      : undefined,
    directive: featureFlags.alignment ? directiveSummary : null,
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
    arcOneState: arcOneState ?? undefined,
    remnant: featureFlags.remnantSystemEnabled ? remnantState : null,
    seasonResetNeeded,
    newSeasonIndex: seasonResetNeeded ? currentSeasonIndex : undefined,
    seasonRecap: seasonResetNeeded ? seasonRecap : undefined,
    seasonContext,
  };
}
