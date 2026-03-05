"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { AllocationPayload } from "@/lib/play";

type AllocationSectionProps = {
  allocation: AllocationPayload;
  totalAllocation: number;
  allocationValid: boolean;
  savingAllocation: boolean;
  onAllocationChange: (key: keyof AllocationPayload, value: number) => void;
  onSave: () => void;
  /** When true, show resource generation preview below each slider */
  resourcesEnabled?: boolean;
};

/**
 * Returns a short preview string showing how many resources a given allocation
 * value will generate per day. Returns null for keys with no resource output.
 */
function resourcePreviewLabel(
  key: keyof AllocationPayload,
  value: number
): string | null {
  switch (key) {
    case "work":
      return `+${Math.floor(value / 10)} cash`;
    case "study":
      return `+${Math.floor(value / 10)} knowledge`;
    case "social":
      return `+${Math.floor(value / 10)} social leverage`;
    case "health":
      return `+${Math.floor(value / 20)} resilience`;
    case "fun":
      return "(morale boost)";
    default:
      return null;
  }
}

function AllocationSectionComponent({
  allocation,
  totalAllocation,
  allocationValid,
  savingAllocation,
  onAllocationChange,
  onSave,
  resourcesEnabled = false,
}: AllocationSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Step 1: Time Allocation</h2>
        <span className="text-sm text-slate-600">
          Total must equal 100 (current: {totalAllocation})
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.keys(allocation).map((key) => {
          const allocationKey = key as keyof AllocationPayload;
          const preview = resourcesEnabled
            ? resourcePreviewLabel(allocationKey, allocation[allocationKey])
            : null;
          return (
            <label
              key={key}
              className="flex flex-col gap-1 text-sm text-slate-700"
            >
              <span className="capitalize">{key}</span>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                value={allocation[allocationKey]}
                onChange={(e) =>
                  onAllocationChange(allocationKey, Number(e.target.value))
                }
              />
              {preview ? (
                <span className="text-xs text-slate-500">{preview}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      <Button
        onClick={onSave}
        disabled={!allocationValid || savingAllocation}
      >
        {savingAllocation ? "Saving..." : "Save allocation"}
      </Button>
    </section>
  );
}

export const AllocationSection = memo(AllocationSectionComponent);
