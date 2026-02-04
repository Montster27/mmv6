import { Button } from "@/components/ui/button";
import type { Initiative } from "@/types/initiatives";
import type { Faction } from "@/types/factions";

type InitiativeWithStatus = Initiative & {
  contributedToday?: boolean;
  progress?: number;
};

type Props = {
  initiative: InitiativeWithStatus;
  dayIndex: number;
  directive?: {
    faction_key: string;
    title: string;
    description: string;
    status: "active" | "expired" | "completed";
  } | null;
  factions?: Faction[];
  submitting?: boolean;
  onContribute: () => void;
};

export function InitiativePanel({
  initiative,
  dayIndex,
  directive,
  factions,
  submitting,
  onContribute,
}: Props) {
  const progress = initiative.progress ?? 0;
  const remaining = Math.max(initiative.ends_day_index - dayIndex + 1, 0);
  const directiveFaction = directive
    ? factions?.find((item) => item.key === directive.faction_key)
    : null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
      {directive ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 space-y-1">
          <p className="text-xs font-semibold text-slate-600">This week’s focus</p>
          <p className="text-sm text-slate-700">
            {directiveFaction?.name ?? directive.faction_key}
          </p>
          <p className="text-xs text-slate-600">{directive.title}</p>
          <p className="text-xs text-slate-600">{directive.description}</p>
          {directive.status === "completed" ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
              Directive completed
            </span>
          ) : null}
        </div>
      ) : null}
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
