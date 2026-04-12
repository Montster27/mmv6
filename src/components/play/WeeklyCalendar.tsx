"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { RoutineActivity, PlayerScheduleSelection } from "@/types/routine";
import { ROUTINE_BUDGET_HALF_DAYS } from "@/types/routine";
import { diegeticDateLabel, weekNumber } from "@/core/routine/constants";

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  academic: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800" },
  creative: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800" },
  social:   { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800" },
  physical: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800" },
  work:     { bg: "bg-stone-50", border: "border-stone-300", text: "text-stone-800" },
  practical:{ bg: "bg-stone-50", border: "border-stone-300", text: "text-stone-800" },
};

type Props = {
  activities: RoutineActivity[];
  weekStart: number;
  onCommit: (activityKeys: string[]) => Promise<void>;
  playerFlags?: Record<string, boolean>;
};

export function WeeklyCalendar({ activities, weekStart, onCommit, playerFlags = {} }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);

  const totalCost = useMemo(() => {
    let cost = 0;
    for (const key of selected) {
      const act = activities.find((a) => a.activity_key === key);
      if (act) cost += act.half_day_cost;
    }
    return cost;
  }, [selected, activities]);

  const overBudget = totalCost > ROUTINE_BUDGET_HALF_DAYS;
  const weekNum = weekNumber(weekStart);
  const weekLabel = diegeticDateLabel(weekStart);

  function toggleActivity(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function isLocked(activity: RoutineActivity): boolean {
    if (!activity.requirements) return false;
    const req = activity.requirements as Record<string, unknown>;
    if (typeof req.requires_flag === "string" && !playerFlags[req.requires_flag]) {
      return true;
    }
    return false;
  }

  async function handleCommit() {
    if (overBudget || selected.size === 0 || committing) return;
    setCommitting(true);
    try {
      await onCommit(Array.from(selected));
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-[#c1666b]/30 bg-[#faf3e8] px-5 py-5 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4a5568]">
          Week {weekNum}
        </p>
        <p className="font-heading text-lg font-semibold text-[#1a2744]">
          Plan Your Week
        </p>
        <p className="text-sm text-[#4a5568]">{weekLabel}</p>
      </div>

      {/* Budget meter */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: ROUTINE_BUDGET_HALF_DAYS }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-6 rounded-sm border ${
                i < totalCost
                  ? overBudget
                    ? "bg-[#c1666b] border-[#c1666b]"
                    : "bg-[#7eb8a0] border-[#5a9a7d]"
                  : "bg-white border-[#d1c7b7]"
              }`}
            />
          ))}
        </div>
        <span className={`text-sm font-medium tabular-nums ${overBudget ? "text-[#c1666b]" : "text-[#4a5568]"}`}>
          {totalCost} of {ROUTINE_BUDGET_HALF_DAYS} half-days
        </span>
      </div>

      {overBudget && (
        <p className="text-sm text-[#c1666b] font-medium">
          Too many activities — drop one to fit your week.
        </p>
      )}

      {/* Activity grid */}
      <div className="space-y-2">
        {activities.map((act) => {
          const locked = isLocked(act);
          const isSelected = selected.has(act.activity_key);
          const colors = CATEGORY_COLORS[act.category] ?? CATEGORY_COLORS.practical;

          return (
            <button
              key={act.activity_key}
              onClick={() => !locked && toggleActivity(act.activity_key)}
              disabled={locked}
              className={`w-full text-left rounded-md border-2 px-4 py-3 transition-all ${
                locked
                  ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                  : isSelected
                  ? `${colors.bg} ${colors.border} ring-2 ring-offset-1 ring-[#1a2744]/20`
                  : `bg-white border-[#d1c7b7] hover:border-[#c1666b]/40`
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${locked ? "text-gray-400" : colors.text}`}>
                      {act.display_name}
                    </span>
                    <span className="text-xs text-[#4a5568] bg-[#f0ebe3] px-1.5 py-0.5 rounded">
                      {act.half_day_cost === 1 ? "½ day" : `${act.half_day_cost} half-days`}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                      {act.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#4a5568] mt-1 italic leading-relaxed">
                    {locked ? "You haven't unlocked this yet." : act.flavor_text}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  isSelected
                    ? "bg-[#1a2744] border-[#1a2744]"
                    : locked
                    ? "border-gray-300"
                    : "border-[#d1c7b7]"
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Commit button */}
      <div className="pt-2">
        <Button
          onClick={handleCommit}
          disabled={overBudget || selected.size === 0 || committing}
          className="w-full bg-[#5a9a7d] hover:bg-[#4a8a6d] text-white font-semibold disabled:opacity-50"
        >
          {committing ? "Committing…" : "Commit Week"}
        </Button>
      </div>
    </div>
  );
}
