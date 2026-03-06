"use client";

import { useState } from "react";
import type { ArcBeat } from "@/types/dailyRun";
import type { ArcStepOption } from "@/domain/arcs/types";
import { STREAM_LABELS } from "@/types/arcOneStreams";

type ArcBeatCardProps = {
  beat: ArcBeat;
  dayIndex: number;
  onChoice: (beat: ArcBeat, option: ArcStepOption) => Promise<void>;
  disabled?: boolean;
};

export function ArcBeatCard({ beat, dayIndex, onChoice, disabled }: ArcBeatCardProps) {
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamLabel = STREAM_LABELS[beat.stream_id as keyof typeof STREAM_LABELS] ?? beat.stream_id;
  const daysLeft = beat.expires_on_day - dayIndex;

  async function handleChoice(option: ArcStepOption) {
    if (choosing || chosen) return;
    setChoosing(true);
    setError(null);
    try {
      await onChoice(beat, option);
      setChosen(option.option_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChoosing(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            {streamLabel}
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-gray-900">{beat.title}</h3>
        </div>
        {daysLeft <= 1 && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Expires today
          </span>
        )}
      </div>

      {/* Body */}
      <p className="mb-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line">{beat.body}</p>

      {/* Already chosen */}
      {chosen && (
        <p className="text-sm font-medium text-amber-700">
          ✓ {beat.options.find((o) => o.option_key === chosen)?.label ?? "Choice recorded"}
        </p>
      )}

      {/* Options */}
      {!chosen && (
        <div className="flex flex-col gap-2">
          {beat.options.map((option) => (
            <button
              key={option.option_key}
              onClick={() => handleChoice(option)}
              disabled={choosing || disabled}
              className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {option.label}
              {option.energy_cost ? (
                <span className="ml-2 text-xs text-gray-400">−{option.energy_cost} energy</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
