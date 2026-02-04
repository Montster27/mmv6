import { memo } from "react";
import { Button } from "@/components/ui/button";

const STEP_LABELS = [
  "A thread you keep pulling.",
  "The thread pulls back.",
  "The shape comes into focus.",
];

type ArcSummary = {
  arc_key: string;
  title: string;
  description: string;
  status: "not_started" | "active" | "completed";
  current_step: number | null;
  step?: {
    step_index: number;
    title: string;
    body: string;
    choices: Array<{ key: string; label: string; flags?: Record<string, boolean> }>;
  } | null;
};

type Props = {
  arc: ArcSummary;
  availableArcs?: Array<{ key: string; title: string; description: string }>;
  submitting?: boolean;
  onStart: () => void;
  onAdvance: (nextStep: number, complete: boolean) => void;
  onBeginUnlocked?: (arcKey: string) => void;
};

function ArcPanelComponent({
  arc,
  availableArcs,
  submitting,
  onStart,
  onAdvance,
  onBeginUnlocked,
}: Props) {
  const stepIndex = Math.min(arc.current_step ?? 0, STEP_LABELS.length - 1);
  const stepLabel = arc.step?.title ?? STEP_LABELS[stepIndex];
  const isComplete = arc.status === "completed";
  const isActive = arc.status === "active";
  const canAdvance =
    isActive &&
    typeof arc.current_step === "number" &&
    arc.current_step < STEP_LABELS.length;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Arc</h3>
        <p className="text-sm text-slate-700">{arc.title}</p>
      </div>
      {arc.status === "not_started" ? (
        <Button variant="outline" onClick={onStart} disabled={submitting}>
          Start Arc
        </Button>
      ) : null}
      {isActive ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">{stepLabel}</p>
          <Button
            variant="outline"
            onClick={() => {
              const nextStep = (arc.current_step ?? 0) + 1;
              onAdvance(nextStep, nextStep >= STEP_LABELS.length);
            }}
            disabled={submitting || !canAdvance}
          >
            Continue
          </Button>
        </div>
      ) : null}
      {isComplete ? (
        <p className="text-xs text-slate-500">Completed.</p>
      ) : null}

      {availableArcs && availableArcs.length > 0 ? (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <p className="text-xs font-semibold text-slate-600">New thread available</p>
          {availableArcs.map((available) => (
            <div key={available.key} className="space-y-1">
              <p className="text-sm text-slate-700">{available.title}</p>
              <p className="text-xs text-slate-600">{available.description}</p>
              <p className="text-[11px] text-slate-500">Unlocked by alignment</p>
              <Button
                variant="outline"
                onClick={() => onBeginUnlocked?.(available.key)}
                disabled={submitting || !onBeginUnlocked}
              >
                Begin
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const ArcPanel = memo(ArcPanelComponent);
