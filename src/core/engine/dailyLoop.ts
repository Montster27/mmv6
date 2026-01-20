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
import {
  ensureSkillBankUpToDate,
  ensureTensionsUpToDate,
  fetchSkillAllocations,
  fetchPosture,
  fetchSkillBank,
  fetchTensions,
} from "@/lib/dailyInteractions";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
} from "@/types/dailyInteraction";
import type { Storylet, StoryletRun } from "@/types/storylets";

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
  tensions,
  skillBank,
  posture,
}: {
  tensions: DailyTension[];
  skillBank: SkillBank | null;
  posture: DailyPosture | null;
}) {
  if (tensions.some((t) => !t.resolved_at)) return true;
  if (skillBank && skillBank.available_points > 0) return true;
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
    allocation,
    runs,
    storyletsRaw,
    boosted,
    tensions,
    skillBank,
    posture,
    allocations,
  ] = await Promise.all([
    fetchDailyState(userId),
    fetchTimeAllocation(userId, dayIndex),
    fetchTodayRuns(userId, dayIndex),
    fetchTodayStoryletCandidates(seasonContext.currentSeason.season_index),
    hasSentBoostToday(userId, dayIndex),
    fetchTensions(userId, dayIndex),
    fetchSkillBank(userId),
    fetchPosture(userId, dayIndex),
    fetchSkillAllocations(userId, dayIndex),
    // Note: we fetch recent history separately below.
  ]);

  const recentRuns =
    (await fetchRecentStoryletRuns(userId, dayIndex, 7).catch(() => [])) ?? [];

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
  });

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
  const setupNeeded = needsSetup({ tensions, skillBank, posture });
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

  return {
    userId,
    dayIndex,
    date: todayUtc,
    stage,
    allocation: allocation ?? null,
    storylets: hasStorylets ? storylets : [fallbackStorylet(), fallbackStorylet()],
    storyletRunsToday: runs,
    canBoost,
    tensions,
    skillBank,
    posture,
    allocations,
    reflectionStatus: reflectionDone ? "done" : "pending",
    microTaskStatus,
    funPulseEligible,
    funPulseDone,
    dailyState: daily,
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
