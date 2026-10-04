import type { RehearsalState } from "./rehearsal";

const RESOURCE_WORDS: Record<string, string> = {
  energy: "Energy", stress: "Stress", knowledge: "Knowledge", cashOnHand: "Cash", socialLeverage: "Social standing",
  physicalResilience: "Physical resilience", morale: "Morale",
};
const words = (id: string) => id.replace(/^npc_/, "").replace(/_/g, " ");

/**
 * What changed in a rehearsal step, in plain sentences. The full before/after state stays
 * available for people who want it; this is what a first-time writer reads.
 */
export function describeRehearsalStep(before: RehearsalState, after: RehearsalState, sceneTitle: (id: string) => string): string[] {
  const out: string[] = [];
  if (before.day !== after.day || before.segment !== after.segment) {
    out.push(`Time moved from day ${before.day} ${before.segment} to day ${after.day} ${after.segment}.`);
  }
  for (const key of Object.keys(RESOURCE_WORDS)) {
    const a = before.resources[key as keyof typeof before.resources], b = after.resources[key as keyof typeof after.resources];
    if (typeof a === "number" && typeof b === "number" && a !== b) out.push(`${RESOURCE_WORDS[key]} went from ${a} to ${b}.`);
  }
  const added = after.flags.filter((flag) => !before.flags.includes(flag));
  if (added.length) out.push(`Remembered: ${added.map((f) => f.replace(/_/g, " ")).join(", ")}.`);
  const closed = after.precluded.filter((key) => !before.precluded.includes(key));
  if (closed.length) out.push(`Closed off for good: ${closed.join(", ")}.`);
  const trained = after.practiced.filter((skill) => !before.practiced.includes(skill));
  if (trained.length) out.push(`Practiced: ${trained.join(", ")}.`);
  for (const [npc, rel] of Object.entries(after.relationships)) {
    const was = before.relationships[npc];
    if (!was) { out.push(`Met ${words(npc)}${rel.relationship != null ? ` (relationship ${rel.relationship})` : ""}.`); continue; }
    for (const field of ["relationship", "trust", "reliability", "emotionalLoad"] as const) {
      if (was[field] !== rel[field] && rel[field] != null) out.push(`${words(npc)}: ${field === "emotionalLoad" ? "emotional load" : field} ${was[field] ?? 0} → ${rel[field]}.`);
    }
  }
  for (const [track, keys] of Object.entries(after.resolved)) {
    const before_ = new Set(before.resolved[track] ?? []);
    for (const key of keys) if (!before_.has(key)) out.push(`Finished scene “${key}”.`);
  }
  for (const [track, state] of Object.entries(after.track_states)) {
    if (before.track_states[track] !== state && state) out.push(`A storyline moved to “${state.replace(/_/g, " ")}”.`);
  }
  void sceneTitle;
  return out;
}
