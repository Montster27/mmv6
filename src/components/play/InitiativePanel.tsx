import { Button } from "@/components/ui/button";
import type { Initiative } from "@/types/initiatives";

type InitiativeWithStatus = Initiative & {
  contributedToday?: boolean;
  progress?: number;
};

type Props = {
  initiative: InitiativeWithStatus;
  dayIndex: number;
  submitting?: boolean;
  onContribute: () => void;
};

export function InitiativePanel({ initiative, dayIndex, submitting, onContribute }: Props) {
  const progress = initiative.progress ?? 0;
  const remaining = Math.max(initiative.ends_day_index - dayIndex + 1, 0);
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Initiative</h3>
        <p className="text-sm text-slate-700">{initiative.title}</p>
      </div>
      <p className="text-xs text-slate-600">{initiative.description}</p>
      <p className="text-xs text-slate-600">
        Progress: {progress}/{initiative.goal} · {remaining} days left
      </p>
      <Button
        variant="outline"
        onClick={onContribute}
        disabled={submitting || initiative.contributedToday}
      >
        {initiative.contributedToday ? "Contribution recorded" : "Contribute today"}
      </Button>
    </div>
  );
}
