import type { Storylet, StoryletRun } from "@/types/storylets";
import type { DailyRunStage } from "@/types/dailyRun";

export function runsForTodayPair(runs: StoryletRun[], storyletPair: Storylet[]): StoryletRun[] {
    const ids = new Set(storyletPair.map((s) => s.id));
    return runs.filter((run) => ids.has(run.storylet_id));
}

export function computeStage(
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
