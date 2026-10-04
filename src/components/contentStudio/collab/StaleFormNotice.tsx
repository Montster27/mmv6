"use client";

import { buttonClass, panelClass } from "./shared";

/**
 * Shown when someone else saved while a form was open. The user's text is kept;
 * they compare the latest saved object and acknowledge the new revision.
 */
export function StaleFormNotice({
  startedAt,
  latest,
  onAcknowledge,
}: {
  startedAt: number;
  latest: unknown;
  onAcknowledge: () => void;
}) {
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">This form started at revision {startedAt}</h2>
      <p className="text-sm">
        Your text is preserved. Compare the latest saved object below, incorporate any changes into
        your form, then acknowledge the current revision before saving.
      </p>
      <details>
        <summary className="text-sm">Latest saved object</summary>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(latest ?? null, null, 2)}
        </pre>
      </details>
      <button className={buttonClass} onClick={onAcknowledge}>
        I compared the latest version; keep my edited form
      </button>
    </section>
  );
}
