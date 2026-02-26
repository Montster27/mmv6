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
    arcFirstEnabled: boolean,
    reflectionDone: boolean,
    microTaskEligible: boolean,
    microTaskDone: boolean,
    funPulseEligible: boolean,
    funPulseDone: boolean
): DailyRunStage {
    if (arcFirstEnabled) {
        if (alreadyCompletedToday) return "complete";
        if (!allocationPresent) return "allocation";
        if (microTaskEligible && !microTaskDone) return "microtask";
        if (canBoost) return "social";
        if (!reflectionDone) return "reflection";
        if (funPulseEligible && !funPulseDone) return "fun_pulse";
        return "complete";
    }
    if (!hasStorylets) return "complete";
    if (alreadyCompletedToday) return "complete";
    if (!allocationPresent) return "allocation";
    if (runsForPairCount === 0) return "storylet_1";
    if (runsForPairCount === 1) return "storylet_2";
    if (runsForPairCount === 2) return "storylet_3";
    if (runsForPairCount >= 3 && reflectionDone && funPulseEligible && !funPulseDone) {
        return "fun_pulse";
    }
    if (runsForPairCount >= 3 && reflectionDone) return "complete";
    if (runsForPairCount >= 3 && microTaskEligible && !microTaskDone) return "microtask";
    if (runsForPairCount >= 3 && canBoost) return "social";
    if (runsForPairCount >= 3 && !canBoost) return "reflection";
    return "complete";
}
