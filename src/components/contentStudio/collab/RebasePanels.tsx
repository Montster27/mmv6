"use client";

import { ChangeSummary } from "./ChangeSummary";
import { panelClass, type StudioCtx } from "./shared";

function show(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

/** Changed agreements that reach this assignment, reviewed one by one before a rebase. */
export function ImpactPanel({
  ctx,
  acknowledged,
  setAcknowledged,
}: {
  ctx: StudioCtx;
  acknowledged: string[];
  setAcknowledged: (ids: string[]) => void;
}) {
  const impacts = ctx.data.impacts ?? [];
  if (!ctx.stale || impacts.length === 0) return null;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Changed agreements affecting this assignment</h2>
      <p className="text-sm text-slate-600">
        These changes reach your work through its parent briefs or declared dependencies. Review each
        one before adopting the new baseline. Your draft remains unchanged until you rebase.
      </p>
      {impacts.map((impact) => (
        <div key={impact.id} className="space-y-3 rounded border p-3">
          <h3 className="text-sm font-semibold">
            {impact.title}
            {!impact.after ? " · removed" : ""}
          </h3>
          <p className="text-xs text-slate-500">
            Connection: {impact.path.map(ctx.titleOf).join(" → ")}
          </p>
          <dl className="space-y-2">
            {impact.fields
              .filter((field) => !["id", "key"].includes(field))
              .map((field) => (
                <div key={field}>
                  <dt className="text-xs font-semibold">{field.replaceAll("_", " ")}</dt>
                  <dd className="grid gap-2 text-sm md:grid-cols-2">
                    <div className="whitespace-pre-wrap rounded bg-slate-50 p-2">
                      <span className="block text-xs text-slate-500">Your baseline</span>
                      <p>{show(impact.before?.[field])}</p>
                    </div>
                    <div className="whitespace-pre-wrap rounded bg-indigo-50 p-2">
                      <span className="block text-xs text-slate-500">Current release</span>
                      <p>{show(impact.after?.[field])}</p>
                    </div>
                  </dd>
                </div>
              ))}
          </dl>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged.includes(impact.id)}
              onChange={(event) =>
                setAcknowledged(
                  event.target.checked
                    ? [...acknowledged, impact.id]
                    : acknowledged.filter((id) => id !== impact.id)
                )
              }
            />
            I reviewed the impact of {impact.title}
          </label>
        </div>
      ))}
    </section>
  );
}

/** Overlapping edits: the author must choose which version survives. */
export function ConflictPanel({
  ctx,
  resolutions,
  setResolutions,
}: {
  ctx: StudioCtx;
  resolutions: Record<string, string>;
  setResolutions: (next: Record<string, string>) => void;
}) {
  if (!ctx.stale || ctx.data.conflicts.length === 0) return null;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Resolve overlapping edits</h2>
      <p className="text-sm text-slate-600">
        Compare both versions. Keeping a draft replaces the released object in your workspace; keeping
        the release drops your change. Rebase applies these decisions and requires a new review.
      </p>
      {ctx.data.conflicts.map((conflict) => (
        <div className="space-y-2 rounded border p-3" key={conflict.id}>
          <strong className="text-sm">
            {conflict.draft?.title ?? conflict.released?.title ?? conflict.id}
          </strong>
          <div>
            <p className="text-xs font-semibold">How the two versions differ</p>
            <ChangeSummary kind={conflict.id.split(":")[0]} before={conflict.released} after={conflict.draft} />
            <p className="text-xs text-slate-500">Reads as: the current release → your draft.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(
              [
                ["draft", "Your draft", conflict.draft],
                ["released", "Current release", conflict.released],
              ] as const
            ).map(([choice, label, value]) => (
              <div key={choice}>
                <label className="flex gap-2 text-sm">
                  <input
                    type="radio"
                    name={conflict.id}
                    checked={resolutions[conflict.id] === choice}
                    onChange={() => setResolutions({ ...resolutions, [conflict.id]: choice })}
                  />
                  Keep {label.toLowerCase()}
                </label>
                <details>
                  <summary className="text-xs">Compare {label.toLowerCase()}</summary>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
