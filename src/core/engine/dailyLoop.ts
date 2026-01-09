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
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
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
  microTaskDone: boolean
): DailyRunStage {
  if (!hasStorylets) return "complete";
  if (alreadyCompletedToday) return "complete";
  if (!allocationPresent) return "allocation";
  if (runsForPairCount === 0) return "storylet_1";
  if (runsForPairCount === 1) return "storylet_2";
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

export async function getOrCreateDailyRun(
  userId: string,
  today: Date
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

  const [daily, allocation, runs, storyletsRaw, boosted] = await Promise.all([
    fetchDailyState(userId),
    fetchTimeAllocation(userId, dayIndex),
    fetchTodayRuns(userId, dayIndex),
    fetchTodayStoryletCandidates(),
    hasSentBoostToday(userId, dayIndex),
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
    dayIndex,
    seasonIndex: seasonContext.currentSeason.season_index,
    dailyState: daily ?? null,
    allStorylets: storyletsRaw,
    recentRuns,
    forcedStorylet: arcStorylet ?? undefined,
  });

  const reflection = await getReflection(userId, dayIndex);
  const reflectionDone = isReflectionDone(reflection);
  const microTaskEligible = dayIndex >= 1 && dayIndex % 2 === 0;
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
  const stage = computeStage(
    Boolean(allocation),
    runsForPair.length,
    cadence.alreadyCompletedToday,
    canBoost,
    hasStorylets,
    reflectionDone,
    microTaskEligible,
    microTaskDone
  );

  devLogStage({
    dayIndex,
    hasAllocation: Boolean(allocation),
    runsForPair: runsForPair.length,
    canBoost,
    reflectionDone,
    microTaskEligible,
    microTaskDone,
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
    reflectionStatus: reflectionDone ? "done" : "pending",
    microTaskStatus,
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
