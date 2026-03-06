"use client";

import { RESOURCE_KEYS, type ResourceKey } from "@/core/resources/resourceKeys";

// Show the primary gameplay-relevant keys in the picker
const PICKER_KEYS = RESOURCE_KEYS.filter(
  (k) => !["morale", "skillPoints", "focus", "memory", "networking", "grit"].includes(k)
);

interface ResourcePickerProps {
  resourceKey?: ResourceKey;
  amount?: number;
  onChangeKey: (key: ResourceKey | undefined) => void;
  onChangeAmount: (amount: number) => void;
  label?: string;
  amountLabel?: string;
}

export function ResourcePicker({
  resourceKey,
  amount,
  onChangeKey,
  onChangeAmount,
  label = "Resource",
  amountLabel = "Amount",
}: ResourcePickerProps) {
  return (
    <div className="flex items-end gap-2">
      <label className="flex-1 text-xs text-slate-600">
        {label}
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={resourceKey ?? ""}
          onChange={(e) =>
            onChangeKey(e.target.value ? (e.target.value as ResourceKey) : undefined)
          }
        >
          <option value="">— none —</option>
          {PICKER_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="w-24 text-xs text-slate-600">
        {amountLabel}
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={amount ?? ""}
          disabled={!resourceKey}
          onChange={(e) => onChangeAmount(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
