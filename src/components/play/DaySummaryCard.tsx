"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AllocationSection } from "./AllocationSection";
import type { AllocationPayload } from "@/lib/play";

type Props = {
  dayIndex: number;
  currentSegment: string;
  hoursRemaining: number;
  hoursCommitted: number;
  allocation: AllocationPayload;
  totalAllocation: number;
  allocationValid: boolean;
  savingAllocation: boolean;
  onAllocationChange: (key: keyof AllocationPayload, value: number) => void;
  onSave: () => void;
  resourcesEnabled?: boolean;
};

const SEGMENTS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night" },
];

export default function DaySummaryCard({
  dayIndex,
  currentSegment,
  hoursRemaining,
  hoursCommitted,
  allocation,
  totalAllocation,
  allocationValid,
  savingAllocation,
  onAllocationChange,
  onSave,
  resourcesEnabled = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const workHours = Math.round(allocation.work / 100 * 6);
  const studyHours = allocation.study > 0 ? 2 : 0;
  const activeSegment = currentSegment.toLowerCase();

  return (
    <section
      data-segment={activeSegment}
      className="segment-tinted rounded border border-border bg-card px-5 py-4 space-y-3 prep-stripe-top shadow-warm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="prep-label">
            Day {dayIndex} — <span className="capitalize">{currentSegment}</span>
          </p>
          <p className="text-2xl font-bold text-primary font-heading mt-1">
            {hoursRemaining}h free today
          </p>
        </div>
        <div className="text-right">
          <p className="prep-label">Commitments</p>
          {hoursCommitted > 0 ? (
            <div className="mt-1 space-y-0.5 text-sm font-body text-foreground/75">
              {workHours > 0 && <p>{workHours}h work</p>}
              {studyHours > 0 && <p>{studyHours}h class / study</p>}
            </div>
          ) : (
            <p className="mt-1 text-sm font-body text-muted-foreground/70 italic">None today</p>
          )}
        </div>
      </div>

      <div className="prep-divider" />

      <div className="flex items-center gap-4">
        {SEGMENTS.map((s) => {
          const isActive = s.id === activeSegment;
          return (
            <span
              key={s.id}
              className="prep-label pb-1"
              style={{
                opacity: isActive ? 1 : 0.35,
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive
                  ? "2px solid hsl(14 73% 61%)"
                  : "2px solid transparent",
              }}
            >
              {s.label}
            </span>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground font-stat"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "▲ Hide allocation" : "▾ Adjust allocation"}
      </Button>

      {expanded && (
        <div className="pt-2 border-t border-border/40">
          <AllocationSection
            allocation={allocation}
            totalAllocation={totalAllocation}
            allocationValid={allocationValid}
            savingAllocation={savingAllocation}
            onAllocationChange={onAllocationChange}
            onSave={onSave}
            resourcesEnabled={resourcesEnabled}
          />
        </div>
      )}
    </section>
  );
}
