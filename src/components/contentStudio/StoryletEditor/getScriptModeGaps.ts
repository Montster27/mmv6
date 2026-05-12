import type { Storylet } from "@/types/storylets";

/** Fields present on a storylet that Script mode cannot represent. */
export function getScriptModeGaps(storylet: Storylet): string[] {
  const gaps: string[] = [];
  const req = storylet.requirements;
  if (req && typeof req === "object" && Object.keys(req as Record<string, unknown>).length > 0) {
    gaps.push("requirements");
  }
  if (storylet.default_next_key != null) gaps.push("default_next_key");
  if (storylet.track_id != null) gaps.push("track_id");
  if ((storylet.tags ?? []).length > 0) gaps.push("tags");
  if ((storylet.weight ?? 100) !== 100) gaps.push("weight");
  return gaps;
}

/** New storylets with no track data open in Script; existing ones open in Structured. */
export function defaultEditorTab(storylet: Storylet): "script" | "structured" {
  return storylet.track_id == null ? "script" : "structured";
}
