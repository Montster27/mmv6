import { selectTrackStorylets } from "@/core/tracks/selectTrackStorylets";
import type { Track, TrackProgress, TrackStoryletRow } from "@/types/tracks";
import type { Storylet, StoryletChoice } from "@/types/storylets";

/**
 * Plain-language descriptions of scenes: what a choice does, whether a scene would be
 * offered, and what changed between two versions. Shared by the editor, the preview and
 * the review screen so all three say things the same way.
 */
type Choice = StoryletChoice & Record<string, unknown>;
const RESOURCE_WORDS: Record<string, string> = {
  energy: "energy", stress: "stress", knowledge: "knowledge", cashOnHand: "cash",
  socialLeverage: "social standing", physicalResilience: "physical resilience", morale: "morale",
};
const word = (key: string) => RESOURCE_WORDS[key] ?? key.replace(/_/g, " ");
const signed = (n: number, noun: string) => (n >= 0 ? `Gains ${n} ${noun}` : `Costs ${Math.abs(n)} ${noun}`);
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" && value ? [value] : [];
const hours = (n: number) => `${n} hour${n === 1 ? "" : "s"}`;

/** What happens when the player picks this choice, in short plain sentences. */
export function describeChoiceEffects(raw: StoryletChoice): string[] {
  const choice = raw as Choice;
  const out: string[] = [];
  if (typeof choice.time_cost === "number" && choice.time_cost > 0) out.push(`Takes ${hours(choice.time_cost)}`);
  if (typeof choice.energy_cost === "number" && choice.energy_cost !== 0) out.push(signed(-choice.energy_cost, "energy"));
  const deltas = (choice.outcome?.deltas ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(deltas)) {
    if (key === "resources" && value && typeof value === "object") {
      for (const [res, n] of Object.entries(value as Record<string, unknown>)) if (typeof n === "number" && n !== 0) out.push(signed(n, word(res)));
    } else if (typeof value === "number" && value !== 0) out.push(signed(value, word(key)));
  }
  for (const bucket of ["costs", "rewards"] as const) {
    const resources = (choice[bucket] as { resources?: Record<string, number> } | undefined)?.resources ?? {};
    for (const [res, n] of Object.entries(resources)) if (typeof n === "number" && n !== 0) out.push(signed(bucket === "costs" ? -n : n, word(res)));
  }
  const gate = choice.requires_resource as { key: string; min: number } | undefined;
  if (gate) out.push(`Only available with at least ${gate.min} ${word(gate.key)}`);
  for (const flag of list(choice.sets_flag)) out.push(`Remembers: ${flag.replace(/_/g, " ")}`);
  const closes = list(choice.precludes);
  if (closes.length) out.push(`Closes off for good: ${closes.join(", ")}`);
  const state = choice.sets_track_state as { state?: string } | undefined;
  if (state?.state) out.push(`Moves this storyline to “${state.state.replace(/_/g, " ")}”`);
  if (choice.money_effect === "improve") out.push("Money gets easier");
  if (choice.money_effect === "worsen") out.push("Money gets tighter");
  const tags = list(choice.identity_tags);
  if (tags.length) out.push(`Kind of choice: ${tags.join(", ")}`);
  if (Array.isArray(choice.events_emitted) && choice.events_emitted.length) out.push("Affects how someone feels about the player");
  return out;
}

/** The text the player reads after choosing. */
export function reactionText(raw: StoryletChoice): string {
  const choice = raw as Choice;
  return (typeof choice.reaction_text === "string" && choice.reaction_text) || (typeof choice.outcome?.text === "string" ? choice.outcome.text : "");
}

export type Eligibility = { offered: boolean; reason: string };

/**
 * Would this scene be offered on this day and part of day, on an otherwise untouched run?
 * Uses the same selector as the game. Requirements the preview cannot know about
 * (flags, earlier scenes) are reported so a writer is not misled.
 */
export function sceneEligibility(scene: Storylet, day: number, segment: string): Eligibility {
  const row = scene as unknown as TrackStoryletRow & Record<string, unknown>;
  const due = Number(row.due_offset_days ?? 0);
  const window = Number(row.expires_after_days ?? 0);
  const track = { id: "preview", key: "roommate", title: "Preview", is_enabled: true, category: "life_stream" } as unknown as Track;
  const progress = [{
    id: "preview", user_id: "preview", track_id: "preview", state: "ACTIVE", current_storylet_key: "", storylet_due_day: 0,
    track_state: null, defer_count: 0, started_day: 0, updated_day: day, resolved_storylet_keys: [], next_key_override: null,
  }] as unknown as TrackProgress[];
  const offered = selectTrackStorylets({
    dayIndex: day, currentSegment: segment, tracks: [track], progress,
    storylets: [{ ...row, track_id: "preview", is_active: true, storylet_key: row.storylet_key || "preview_scene", order_index: 0 } as TrackStoryletRow],
  }).length > 0;
  if (offered) {
    const req = (row.requirements ?? {}) as Record<string, unknown>;
    const needs: string[] = [];
    if (req.requires_flag) needs.push(`the “${String(req.requires_flag).replace(/_/g, " ")}” flag`);
    if (Array.isArray(req.requires_storylets) && req.requires_storylets.length) needs.push(`these earlier scenes: ${(req.requires_storylets as string[]).join(", ")}`);
    return { offered: true, reason: needs.length ? `Offered, if the player already has ${needs.join(" and ")}.` : "Offered." };
  }
  if (day < due) return { offered: false, reason: `Not offered yet: it becomes available on day ${due}.` };
  if (day > due + window) {
    return { offered: false, reason: `Not offered: it was only available through day ${due + window}${window === 0 ? " (a window of 0 means that day only)" : ""}.` };
  }
  if (row.segment && row.segment !== segment) return { offered: false, reason: `Not offered: this scene is for the ${String(row.segment)}, not the ${segment}.` };
  return { offered: false, reason: "Not offered: its requirements are not met." };
}

/** One readable line per difference between two versions of a scene. */
export function describeSceneChanges(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined): string[] {
  if (!before && !after) return [];
  if (!before) return ["New scene."];
  if (!after) return ["Scene removed."];
  const out: string[] = [];
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  if (text(before.title) !== text(after.title)) out.push(`Title changed from “${text(before.title)}” to “${text(after.title)}”.`);
  if (text(before.body) !== text(after.body)) {
    const a = text(before.body).split(/\s+/).filter(Boolean).length;
    const b = text(after.body).split(/\s+/).filter(Boolean).length;
    out.push(`Scene text rewritten (${a} → ${b} words).`);
  }
  const pairs: [string, string][] = [["due_offset_days", "Available from day"], ["expires_after_days", "Stays available (extra days)"], ["segment", "Part of day"], ["is_active", "Active"]];
  for (const [key, name] of pairs) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) out.push(`${name}: ${String(before[key] ?? "not set")} → ${String(after[key] ?? "not set")}.`);
  }
  if (JSON.stringify(before.requirements ?? {}) !== JSON.stringify(after.requirements ?? {})) out.push("Requirements for appearing changed.");
  const bc = (Array.isArray(before.choices) ? before.choices : []) as Choice[];
  const ac = (Array.isArray(after.choices) ? after.choices : []) as Choice[];
  const byId = (rows: Choice[]) => new Map(rows.map((c, i) => [c.id ?? `#${i}`, c]));
  const bm = byId(bc), am = byId(ac);
  for (const [id, c] of am) {
    const old = bm.get(id);
    const name = `“${c.label || id}”`;
    if (!old) { out.push(`Choice added: ${name}.`); continue; }
    if (old.label !== c.label) out.push(`Choice relabelled: “${old.label}” → “${c.label}”.`);
    if (reactionText(old) !== reactionText(c)) out.push(`Reaction text changed for ${name}.`);
    const was = describeChoiceEffects(old), now = describeChoiceEffects(c);
    for (const line of now) if (!was.includes(line)) out.push(`${name}: now — ${line.charAt(0).toLowerCase()}${line.slice(1)}.`);
    for (const line of was) if (!now.includes(line)) out.push(`${name}: no longer — ${line.charAt(0).toLowerCase()}${line.slice(1)}.`);
  }
  for (const [id, c] of bm) if (!am.has(id)) out.push(`Choice removed: “${c.label || id}”.`);
  return out;
}

/** Same idea for any record type: scalar fields shown as before → after, lists as added/removed. */
export function describeRecordChanges(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined): string[] {
  if (!before && !after) return [];
  if (!before) return ["New."];
  if (!after) return ["Removed."];
  const skip = new Set(["id", "key", "created_at", "updated_at", "_studio_revision"]);
  const out: string[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (skip.has(key)) continue;
    const a = before[key], b = after[key];
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    const name = key.replace(/_/g, " ");
    if (Array.isArray(a) || Array.isArray(b)) {
      const x = new Set(Array.isArray(a) ? a.map(String) : []), y = new Set(Array.isArray(b) ? b.map(String) : []);
      const added = [...y].filter((v) => !x.has(v)), removed = [...x].filter((v) => !y.has(v));
      if (added.length) out.push(`${name}: added ${added.length} (${added.slice(0, 3).join(", ")}${added.length > 3 ? ", …" : ""}).`);
      if (removed.length) out.push(`${name}: removed ${removed.length}.`);
      if (!added.length && !removed.length) out.push(`${name}: reordered.`);
    } else if (typeof a === "string" || typeof b === "string") {
      const s = (v: unknown) => (typeof v === "string" ? v : "");
      out.push(!s(a) ? `${name}: written.` : !s(b) ? `${name}: cleared.` : s(a).length < 60 && s(b).length < 60 ? `${name}: “${s(a)}” → “${s(b)}”.` : `${name}: reworded.`);
    } else out.push(`${name}: changed.`);
  }
  return out;
}
