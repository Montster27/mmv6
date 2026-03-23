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

/**
 * Phase 3: Replaces the raw AllocationSection in arcOneMode.
 * Shows a brief day-start summary (free hours, committed blocks) with
 * a collapsible panel for adjusting the underlying allocation sliders.
 */
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

  return (
    <section className="rounded border-2 border-primary/20 bg-card px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="prep-label">
            Day {dayIndex} — <span className="capitalize">{currentSegment}</span>
          </p>
          <p className="text-2xl font-bold text-primary font-heading mt-0.5">
            {hoursRemaining}h free today
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground space-y-0.5">
          {hoursCommitted > 0 ? (
            <>
              {workHours > 0 && (
                <p>{workHours}h work</p>
              )}
              {studyHours > 0 && (
                <p>{studyHours}h class / study</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground/60">No commitments today</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, (hoursRemaining / 16) * 100))}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {hoursCommitted}h committed
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
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
