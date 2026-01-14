"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";

type DeltaInfo = {
  energy?: number;
  stress?: number;
  vectors?: Record<string, number>;
};

type Props = {
  message: string | null;
  deltas: DeltaInfo | null;
  onDone?: () => void;
};

const MOMENT_MS = 2500;
const EXIT_MS = 250;

function formatDelta(label: string, value?: number) {
  if (typeof value !== "number" || value === 0) return null;
  const sign = value > 0 ? "+" : "";
  const tone = value > 0 ? "text-teal-600" : "text-slate-500";
  return (
    <span
      className={`rounded-full border border-blue-100 bg-white px-2 py-0.5 text-xs ${tone}`}
    >
      {label} {sign}
      {value}
    </span>
  );
}

export function ConsequenceMoment({ message, deltas, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const exitTimer = window.setTimeout(() => setVisible(false), MOMENT_MS - EXIT_MS);
    const doneTimer = window.setTimeout(() => onDone?.(), MOMENT_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  const deltaItems: ReactElement[] = [];
  const energy = formatDelta("Energy", deltas?.energy);
  if (energy) deltaItems.push(energy);
  const stress = formatDelta("Stress", deltas?.stress);
  if (stress) deltaItems.push(stress);
  const vectors = deltas?.vectors ?? {};
  Object.entries(vectors).forEach(([key, value]) => {
    const item = formatDelta(key, value as number);
    if (item) deltaItems.push(item);
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md border border-blue-200 border-l-4 border-l-blue-400 bg-blue-50/70 px-4 py-3 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
    >
      <p className="text-sm font-medium text-slate-800">
        {message || "Done."}
      </p>
      {deltaItems.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">{deltaItems}</div>
      ) : null}
    </div>
  );
}
