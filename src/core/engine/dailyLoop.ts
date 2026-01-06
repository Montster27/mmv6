import { ensureCadenceUpToDate } from "@/lib/cadence";
import {
  fetchDailyState,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
} from "@/lib/play";
import { hasSentBoostToday } from "@/lib/social";
import { fallbackStorylet } from "@/core/validation/storyletValidation";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";
import type { Storylet, StoryletRun } from "@/types/storylets";

function selectTwoStorylets(storylets: Storylet[], dayIndex: number): Storylet[] {
  if (storylets.length === 0) return [];
  const sorted = [...storylets]; // already sorted by created_at asc upstream
  const start = (dayIndex * 2) % sorted.length;
  const first = sorted[start];
  const second = sorted[(start + 1) % sorted.length] ?? first;
  return [first ?? fallbackStorylet(), second ?? fallbackStorylet()];
}

function runsForTodayPair(runs: StoryletRun[], storyletPair: Storylet[]): StoryletRun[] {
  const ids = new Set(storyletPair.map((s) => s.id));
  return runs.filter((run) => ids.has(run.storylet_id));
}

function computeStage(
  allocationPresent: boolean,
  runsForPairCount: number,
  alreadyCompletedToday: boolean,
  canBoost: boolean,
  hasStorylets: boolean
): DailyRunStage {
  if (!hasStorylets) return "complete";
  if (alreadyCompletedToday) return "complete";
  if (!allocationPresent) return "allocation";
  if (runsForPairCount === 0) return "storylet_1";
  if (runsForPairCount === 1) return "storylet_2";
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

  const cadence = await ensureCadenceUpToDate(userId);
  const dayIndex = cadence.dayIndex;

  const [daily, allocation, runs, storyletsRaw, boosted] = await Promise.all([
    fetchDailyState(userId),
    fetchTimeAllocation(userId, dayIndex),
    fetchTodayRuns(userId, dayIndex),
    fetchTodayStoryletCandidates(),
    hasSentBoostToday(userId, dayIndex),
  ]);

  const storylets = selectTwoStorylets(storyletsRaw, dayIndex);
  const hasStorylets = storylets.length > 0;
  const runsForPair = runsForTodayPair(runs, storylets);
  const canBoost = !boosted;
  const stage = computeStage(
    Boolean(allocation),
    runsForPair.length,
    cadence.alreadyCompletedToday,
    canBoost,
    hasStorylets
  );

  devLogStage({
    dayIndex,
    hasAllocation: Boolean(allocation),
    runsForPair: runsForPair.length,
    canBoost,
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
    reflectionStatus: stage === "reflection" || stage === "complete" ? "pending" : "pending",
    microTaskStatus: "pending",
    dailyState: daily,
  };
}

// Export helpers for testing
export const _testOnly = {
  selectTwoStorylets,
  runsForTodayPair,
  computeStage,
};
