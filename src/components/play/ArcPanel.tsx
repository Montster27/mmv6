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
  submitting?: boolean;
  onStart: () => void;
  onAdvance: (nextStep: number, complete: boolean) => void;
};

export function ArcPanel({ arc, submitting, onStart, onAdvance }: Props) {
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
    </div>
  );
}
