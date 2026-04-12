"use client";

import { Button } from "@/components/ui/button";
import type { PlayerScheduleSelection, RoutineActivity } from "@/types/routine";
import { diegeticDateLabel, weekNumber } from "@/core/routine/constants";

type Props = {
  weekStart: number;
  schedule: PlayerScheduleSelection[];
  activities: RoutineActivity[];
  onPlanNext: () => void;
};

/**
 * Brief summary shown after a routine week completes without interruption.
 * Lists what the player did, then offers "Plan next week".
 */
export function RoutineWeekSummary({ weekStart, schedule, activities, onPlanNext }: Props) {
  const weekNum = weekNumber(weekStart);

  const activityNames = schedule
    .map((s) => {
      const act = activities.find((a) => a.activity_key === s.activity_key);
      return act?.display_name ?? s.activity_key;
    })
    .filter(Boolean);

  const summary =
    activityNames.length > 0
      ? `Your week passed. ${activityNames.join(", ")}.`
      : "Your week passed quietly.";

  return (
    <div className="rounded-lg border-2 border-[#7eb8a0]/30 bg-[#faf3e8] px-5 py-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#4a5568]">
        Week {weekNum} — Complete
      </p>
      <p className="font-heading text-base text-[#1a2744] leading-relaxed">
        {summary}
      </p>
      <div className="flex justify-end pt-1">
        <Button
          onClick={onPlanNext}
          size="sm"
          className="bg-[#5a9a7d] hover:bg-[#4a8a6d] text-white"
        >
          Plan next week →
        </Button>
      </div>
    </div>
  );
}
