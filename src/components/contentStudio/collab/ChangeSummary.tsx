"use client";

import { describeRecordChanges, describeSceneChanges } from "@/core/studio/sceneText";
import type { StudioRecord } from "@/types/studio";

/** A short list of what changed between two versions of an object, in plain words. */
export function ChangeSummary({
  kind,
  before,
  after,
}: {
  kind: string;
  before: StudioRecord | null | undefined;
  after: StudioRecord | null | undefined;
}) {
  const lines = kind === "storylets" ? describeSceneChanges(before, after) : describeRecordChanges(before, after);
  if (lines.length === 0) return <p className="text-sm text-slate-500">No visible differences.</p>;
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-800">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}
