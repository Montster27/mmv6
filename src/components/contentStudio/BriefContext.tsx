import type { StudioRecord } from "@/types/studio";

const fields = [
  ["experience", "Player experience"], ["constraints", "Required constraints"],
  ["suggestions", "Creative suggestions"], ["open_questions", "Open questions"],
  ["entrances", "Entrances"], ["outcomes", "Possible conclusions"],
  ["miss_path", "Miss, decline, and repair"], ["timing", "Timing and costs"],
  ["acceptance", "Acceptance paths"],
];
export function BriefContext({ plans }: { plans: StudioRecord[] }) {
  if (!plans.length) return null;
  return <div className="space-y-3">
    <p className="text-xs text-slate-600">Inherited from this workspace’s baseline and draft. Each source keeps its own constraints; suggestions do not become requirements.</p>
    {plans.map((plan) => <details key={String(plan.id)} className="rounded border border-indigo-100 bg-white p-3" open={plans.length === 1}>
      <summary className="cursor-pointer text-sm font-semibold">{String(plan.kind ?? "Plan")} · {plan.title}</summary>
      <dl className="mt-3 space-y-3">{fields.filter(([field]) => String(plan[field] ?? "").trim()).map(([field,label]) => <div key={field}>
        <dt className={`text-xs font-semibold ${field === "constraints" ? "text-indigo-900" : "text-slate-600"}`}>{label}</dt>
        <dd className="whitespace-pre-wrap text-sm text-slate-800">{String(plan[field])}</dd>
      </div>)}</dl>
    </details>)}
  </div>;
}
