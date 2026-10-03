import { validateStoryletIssues } from "@/core/validation/storyletValidation";
import { selectTrackStorylets } from "@/core/tracks/selectTrackStorylets";
import { CHAPTER_ONE_TRACK_KEYS } from "@/types/tracks";
import type { Track, TrackProgress, TrackStoryletRow } from "@/types/tracks";
import type { StudioChange, StudioIssue, StudioManifest, StudioRecord, StudioScenario, StudioTestResult } from "@/types/studio";
import { STUDIO_KINDS } from "@/types/studio";

export function recordId(row: StudioRecord): string { return String(row.id ?? row.key ?? ""); }
export function emptyManifest(): StudioManifest {
  return { storylets: [], tracks: [], consequences: [], plans: [], definitions: [], scenarios: [] };
}
export function normalizeManifest(raw: Partial<StudioManifest>): StudioManifest {
  return Object.fromEntries(STUDIO_KINDS.map((kind) => [kind, Array.isArray(raw[kind]) ? raw[kind] : []])) as StudioManifest;
}
export function overlayManifest(base: StudioManifest, changes: StudioChange[]): StudioManifest {
  const next = normalizeManifest(base);
  for (const change of changes) {
    next[change.kind] = next[change.kind].filter((row) => recordId(row) !== change.object_id);
    if (change.payload) next[change.kind].push(change.payload);
  }
  return next;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export function rebaseConflicts(base: StudioManifest, current: StudioManifest, changes: StudioChange[]): string[] {
  return changes.flatMap((change) => {
    const before = base[change.kind].find((row) => recordId(row) === change.object_id) ?? null;
    const now = current[change.kind].find((row) => recordId(row) === change.object_id) ?? null;
    return stable(before) !== stable(now) && stable(change.payload) !== stable(now) ? [`${change.kind}:${change.object_id}`] : [];
  });
}
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export function validateManifest(manifest: StudioManifest): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const add = (severity: StudioIssue["severity"], objectId: string, message: string) => issues.push({ severity, objectId, message });
  for (const kind of STUDIO_KINDS) {
    const seen = new Set<string>();
    for (const row of manifest[kind]) {
      const id = recordId(row);
      if (!id || seen.has(id)) add("error", id, `Missing or duplicate identity in ${kind}.`);
      seen.add(id);
    }
  }
  const trackIds = new Set(manifest.tracks.map(recordId));
  const allIds = new Set(STUDIO_KINDS.flatMap((kind) => manifest[kind].map(recordId)));
  const trackKeys = new Set<string>();
  for (const track of manifest.tracks) {
    if (!track.key || trackKeys.has(String(track.key))) add("error", recordId(track), "Track key must be present and unique.");
    trackKeys.add(String(track.key));
    if (track.is_enabled && !CHAPTER_ONE_TRACK_KEYS.some((key) => key === track.key)) add("error", recordId(track), "This enabled track is not supported by the current game. Add runtime support before release.");
  }
  const keys = new Set<string>();
  const storyletIds = new Set(manifest.storylets.map(recordId));
  for (const row of manifest.storylets) {
    const id = recordId(row);
    const validation = validateStoryletIssues(row);
    for (const issue of validation.errors) add("error", id, `${issue.path}: ${issue.message}`);
    for (const issue of validation.warnings) add("warning", id, `${issue.path}: ${issue.message}`);
    if (row.track_id) {
      if (!trackIds.has(String(row.track_id))) add("error", id, "Track does not exist.");
      const key = `${row.track_id}:${row.storylet_key}`;
      if (!row.storylet_key || keys.has(key)) add("error", id, "Missing or duplicate storylet key within track.");
      keys.add(key);
      for (const field of ["due_offset_days", "expires_after_days"]) {
        if (!Number.isInteger(row[field]) || Number(row[field]) < 0) add("error", id, `${field} must be a nonnegative whole number.`);
      }
    }
    const req = (row.requirements ?? {}) as Record<string, unknown>;
    const sameTrack = manifest.storylets.filter((other) => other.track_id === row.track_id);
    const required = strings(req.requires_storylets);
    const anyRequired = strings(req.requires_any_storylets);
    const excluded = strings(req.excludes_storylets);
    for (const key of [...required, ...anyRequired, ...excluded]) {
      if (!sameTrack.some((other) => other.storylet_key === key)) add("error", id, `History key ${key} does not exist on this track.`);
    }
    if (required.some((key) => excluded.includes(key)) || (anyRequired.length > 0 && anyRequired.every((key) => excluded.includes(key)))) add("error", id, "Causal requirements contradict their exclusions.");
    for (const key of required) {
      const cause = sameTrack.find((other) => other.storylet_key === key);
      if (cause && Number(cause.due_offset_days) > Number(row.due_offset_days) + Number(row.expires_after_days)) add("error", id, `Prerequisite ${key} starts after this scene expires.`);
    }
    const choices = Array.isArray(row.choices) ? row.choices as StudioRecord[] : [];
    for (const key of [row.default_next_key, ...choices.map((choice) => choice.next_key)].filter((key) => typeof key === "string" && key)) {
      if (!sameTrack.some((other) => other.storylet_key === key)) add("error", id, `Next scene ${key} does not exist on this track.`);
    }
    for (const choice of choices) if (choice.targetStoryletId && !storyletIds.has(String(choice.targetStoryletId))) add("error", id, `Choice target ${choice.targetStoryletId} is missing.`);
    if (Number(row.expires_after_days) > 0 && /\b(first night|yesterday|tomorrow|tonight)\b/i.test(String(row.body ?? ""))) add("warning", id, "Flexible timing contains date-specific prose; review the actual offered days.");
  }
  const plans = new Map(manifest.plans.map((row) => [recordId(row), row]));
  for (const row of [...manifest.plans, ...manifest.definitions]) {
    const id = recordId(row);
    const path = new Set([id]);
    let parent = row.parent_id;
    while (typeof parent === "string" && parent) {
      if (path.has(parent)) { add("error", id, "Planning hierarchy contains a cycle."); break; }
      path.add(parent);
      const next = plans.get(parent);
      if (!next) { add("error", id, `Parent plan ${parent} is missing.`); break; }
      parent = next.parent_id;
    }
    for (const scene of strings(row.storylet_ids)) if (!storyletIds.has(scene)) add("error", id, `Linked storylet ${scene} is missing.`);
    for (const dep of strings(row.dependencies)) if (!allIds.has(dep)) add("error", id, `Dependency ${dep} is missing.`);
    if (row.runtime_required === true) add("error", id, "This planned capability is not implemented by the current runtime. Resolve the engine dependency before release.");
    if (row.kind === "arc" && !String(row.miss_path ?? "").trim()) add("warning", id, "Describe what happens if the player misses or declines this arc.");
  }
  return issues;
}

/** Bounded offer tests use the same selector as play. They do not claim full outcome simulation. */
export function runStudioScenarios(manifest: StudioManifest): StudioTestResult[] {
  const tracks = manifest.tracks.filter((row) => CHAPTER_ONE_TRACK_KEYS.some((key) => key === row.key)) as unknown as Track[];
  const storylets = manifest.storylets.filter((row) => row.track_id && row.storylet_key).map((row) => ({ ...row, order_index: Number(row.order_index ?? 0) })) as unknown as TrackStoryletRow[];
  return (manifest.scenarios as unknown as StudioScenario[]).map((scenario) => {
    try {
      const progress: TrackProgress[] = tracks.map((track) => ({
        id: `test:${track.id}`, user_id: "studio", track_id: track.id, state: "ACTIVE", current_storylet_key: "", storylet_due_day: 0,
        track_state: null, started_day: 0, defer_count: 0, updated_day: scenario.day,
        resolved_storylet_keys: scenario.resolved?.[track.id] ?? [], next_key_override: null,
      }));
      const offered = selectTrackStorylets({
        dayIndex: scenario.day, currentSegment: scenario.segment, tracks, storylets, progress,
        resolvedChoicesByTrack: new Map(Object.entries(scenario.choices ?? {}).map(([id, values]) => [id, new Set(values)])),
        globalFlags: new Set(scenario.flags ?? []), trainedSkillIds: new Set(scenario.skills ?? []), precludedKeys: new Set(scenario.precluded ?? []),
      }).map((offer) => offer.storylet.storylet_key);
      const failures = [...(scenario.expected ?? []).filter((key) => !offered.includes(key)).map((key) => `Expected ${key} to be offered.`), ...(scenario.forbidden ?? []).filter((key) => offered.includes(key)).map((key) => `${key} must not be offered.`)];
      const validKeys = new Set(storylets.map((row) => row.storylet_key));
      for (const key of [...(scenario.expected ?? []), ...(scenario.forbidden ?? []), ...(scenario.precluded ?? [])]) {
        if (!validKeys.has(key)) failures.push(`Scenario references missing storylet ${key}.`);
      }
      for (const [trackId, history] of Object.entries(scenario.resolved ?? {})) {
        if (!tracks.some((track) => track.id === trackId)) failures.push(`Scenario references missing track ${trackId}.`);
        for (const key of history) if (!storylets.some((row) => row.track_id === trackId && row.storylet_key === key)) failures.push(`History ${key} is not on track ${trackId}.`);
      }
      if (!Number.isInteger(scenario.day) || scenario.day < 0 || !["morning", "afternoon", "evening", "night"].includes(scenario.segment)) failures.push("Invalid scenario day or segment.");
      if (!(scenario.expected?.length || scenario.forbidden?.length)) failures.push("Add at least one expected or forbidden offer.");
      return { id: scenario.id, title: scenario.title, passed: failures.length === 0, offered, failures };
    } catch (error) {
      return { id: scenario.id, title: scenario.title, passed: false, offered: [], failures: [error instanceof Error ? error.message : "Invalid scenario"] };
    }
  });
}
