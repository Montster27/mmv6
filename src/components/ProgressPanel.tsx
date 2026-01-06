import type { DailyState } from "@/types/daily";
import type { SevenVectors } from "@/types/vectors";
import { summarizeVectors } from "@/core/ui/vectorSummary";

type DeltaInfo = {
  energy?: number;
  stress?: number;
  vectors?: Record<string, number>;
};

type Props = {
  dailyState?: Pick<DailyState, "energy" | "stress" | "vectors"> | null;
  lastAppliedDeltas?: DeltaInfo | null;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

function toVectors(raw: DailyState["vectors"]): SevenVectors {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw).filter(
      ([, v]) => typeof v === "number"
    ) as [string, number][];
    return Object.fromEntries(entries);
  }
  return {};
}

function bar(value?: number) {
  if (typeof value !== "number") return null;
  const width = clamp(value);
  return (
    <div className="h-2 w-full rounded bg-slate-200">
      <div
        className="h-2 rounded bg-slate-600"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function deltaBadge(delta?: number) {
  if (typeof delta !== "number" || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  return (
    <span className="ml-2 text-xs text-slate-600">
      {sign}
      {delta}
    </span>
  );
}

export function ProgressPanel({ dailyState, lastAppliedDeltas }: Props) {
  const energy = dailyState?.energy;
  const stress = dailyState?.stress;
  const vectors = toVectors(dailyState?.vectors ?? {});

  const vectorKeys =
    Object.keys(vectors).length > 0
      ? Object.keys(vectors)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 7)
      : [];

  const summary = summarizeVectors(vectors, lastAppliedDeltas ?? undefined);

  return (
    <aside className="rounded-md border border-slate-200 bg-white px-4 py-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-700">
          <span>Energy</span>
          <span>
            {typeof energy === "number" ? energy : "—"}
            {deltaBadge(lastAppliedDeltas?.energy)}
          </span>
        </div>
        {bar(energy)}
        <div className="flex items-center justify-between text-sm text-slate-700">
          <span>Stress</span>
          <span>
            {typeof stress === "number" ? stress : "—"}
            {deltaBadge(lastAppliedDeltas?.stress)}
          </span>
        </div>
        {bar(stress)}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">Vectors</p>
        {vectorKeys.length === 0 ? (
          <p className="text-sm text-slate-700">No vectors yet.</p>
        ) : (
          <div className="space-y-2">
            {vectorKeys.map((key) => {
              const value = vectors[key] ?? 0;
              const delta = lastAppliedDeltas?.vectors?.[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span className="capitalize">{key}</span>
                    <span>
                      {value}
                      {deltaBadge(delta)}
                    </span>
                  </div>
                  {bar(value)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-sm text-slate-700">{summary}</p>
    </aside>
  );
}
