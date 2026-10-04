import { describe, expect, it } from "vitest";
import { buildInitialTrackProgress } from "@/core/tracks/selectTrackStorylets";
import { CHAPTER_ONE_TRACK_KEYS } from "@/types/tracks";
import type { Track, TrackStoryletRow } from "@/types/tracks";
import type { StudioManifest } from "@/types/studio";
import { emptyManifest, overlayManifest, runStudioScenarios, validateManifest } from "./manifest";
import { clearCatalogChanges, isStarterInstalled, starterChanges, starterPack } from "./starterPack";
import { studyGroupPilot } from "./studyGroupPilot";
import { validateStoryletIssues } from "@/core/validation/storyletValidation";

const tracks = CHAPTER_ONE_TRACK_KEYS.map((key) => ({ id: `t-${key}`, key, title: key, is_enabled: true }));
const base = (): StudioManifest => ({ ...emptyManifest(), tracks });
const withStarter = (m: StudioManifest = base()) => overlayManifest(m, starterChanges(m));

describe("starter pack", () => {
  it("validates with no errors and every offer test passes", () => {
    const manifest = withStarter();
    expect(validateManifest(manifest).filter((issue) => issue.severity === "error")).toEqual([]);
    const results = runStudioScenarios(manifest);
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.map((r) => ({ t: r.title, f: r.failures }))).toEqual(results.map((r) => ({ t: r.title, f: [] })));
  });

  it("gives every Chapter One track a scene, so a new run can start", () => {
    const manifest = withStarter();
    const progress = buildInitialTrackProgress(
      "user",
      manifest.tracks as unknown as Track[],
      manifest.storylets as unknown as TrackStoryletRow[],
      0
    );
    expect(progress.map((row) => row.track_id).sort()).toEqual(tracks.map((t) => t.id).sort());
  });

  it("follows the rules it teaches: precludes and identity tags on every choice, no names, no anachronism", () => {
    const manifest = withStarter();
    const allowed = new Set(["risk", "people", "achieve", "safety"]);
    for (const scene of manifest.storylets) {
      expect(validateStoryletIssues(scene).errors).toEqual([]);
      for (const choice of scene.choices as Record<string, unknown>[]) {
        expect(Array.isArray(choice.precludes)).toBe(true);
        expect((choice.identity_tags as string[]).length).toBeGreaterThan(0);
        for (const tag of choice.identity_tags as string[]) expect(allowed.has(tag)).toBe(true);
        expect(choice).toHaveProperty("time_cost");
        expect(choice).toHaveProperty("energy_cost");
      }
      const text = JSON.stringify(scene);
      expect(text).not.toMatch(/\b(Scott|Doug|Mike|Keith|Priya|Marsh|Glenn|Jordan|Miguel)\b/);
      expect(text).not.toMatch(/\b(cell ?phone|email|text message|internet|laptop|smartphone|google|wifi)\b/i);
    }
  });

  it("is idempotent to detect and refuses a manifest without the six tracks", () => {
    expect(isStarterInstalled(base())).toBe(false);
    expect(isStarterInstalled(withStarter())).toBe(true);
    expect(() => starterPack({ ...emptyManifest(), tracks: tracks.slice(0, 3) })).toThrow(/enabled tracks/);
  });
});

describe("clear catalog", () => {
  it("removes scenes, tests and rules and leaves no dangling links in plans", () => {
    // A catalog with a pilot arc: plans and definitions point at scenes.
    let manifest = base();
    const pilot = studyGroupPilot(manifest);
    manifest = overlayManifest(
      manifest,
      (Object.keys(pilot) as (keyof StudioManifest)[]).flatMap((kind) =>
        pilot[kind].map((row) => ({ kind, object_id: String(row.id), payload: row }))
      )
    );
    manifest.storylets.push({ id: "old-1", slug: "old-1", storylet_key: "old-1", title: "Old", body: "Old.", choices: [{ id: "a", label: "A" }], is_active: true, track_id: "t-roommate", due_offset_days: 0, expires_after_days: 0, requirements: {} });
    manifest.consequences.push({ key: "old_rule", id: "old_rule" });
    expect(manifest.storylets.length).toBeGreaterThan(1);

    const cleared = overlayManifest(manifest, clearCatalogChanges(manifest));
    expect(cleared.storylets).toEqual([]);
    expect(cleared.scenarios).toEqual([]);
    expect(cleared.consequences).toEqual([]);
    expect(cleared.tracks).toHaveLength(6);
    expect(cleared.plans.length).toBe(manifest.plans.length);
    const errors = validateManifest(cleared).filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
  });

  it("clearing then adding the starter gives a bootable, valid draft in one pass", () => {
    const manifest = base();
    manifest.storylets.push({ id: "old-1", slug: "old-1", storylet_key: "old-1", title: "Old", body: "Old.", choices: [{ id: "a", label: "A" }], is_active: true, track_id: "t-roommate", due_offset_days: 0, expires_after_days: 0, requirements: {} });
    const fresh = overlayManifest(manifest, [...clearCatalogChanges(manifest), ...starterChanges(manifest)]);
    expect(fresh.storylets.some((row) => row.id === "old-1")).toBe(false);
    expect(isStarterInstalled(fresh)).toBe(true);
    expect(validateManifest(fresh).filter((i) => i.severity === "error")).toEqual([]);
    expect(runStudioScenarios(fresh).every((r) => r.passed)).toBe(true);
  });
});
