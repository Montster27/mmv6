import { describe, expect, it } from "vitest";
import { emptyManifest, overlayManifest, rebaseConflicts, runStudioScenarios, validateManifest } from "./manifest";
import type { StudioManifest, StudioRecord } from "@/types/studio";
const track = { id: "track", key: "roommate", title: "Roommate", is_enabled: true };
const scene = (id: string, extra: StudioRecord = {}) => ({ id, slug: id, title: id, body: "A scene.", choices: [{ id: "hello", label: "Say hello" }], is_active: true, requirements: {}, track_id: "track", storylet_key: id, due_offset_days: 0, expires_after_days: 0, order_index: 0, ...extra });
function baseline(): StudioManifest { return { ...emptyManifest(), tracks: [track], storylets: [scene("arrival")] }; }

describe("collaborative content integration", () => {
  it("keeps drafts isolated and detects overlapping concurrent edits", () => {
    const base = baseline();
    const draft = { kind: "storylets" as const, object_id: "arrival", payload: scene("arrival", { title: "Writer A" }) };
    expect(overlayManifest(base, [draft]).storylets[0].title).toBe("Writer A");
    expect(base.storylets[0].title).toBe("arrival");
    const live = overlayManifest(base, [{ ...draft, payload: scene("arrival", { title: "Writer B" }) }]);
    expect(rebaseConflicts(base, live, [draft])).toEqual(["storylets:arrival"]);
  });
  it("rebases independent work without dropping it and treats identical changes as compatible", () => {
    const base = baseline();
    const change = { kind: "plans" as const, object_id: "plot", payload: { id: "plot", title: "Plot" } };
    expect(rebaseConflicts(base, overlayManifest(base,[change]), [change])).toEqual([]);
    expect(rebaseConflicts(base, overlayManifest(base,[change]), [{ kind: "storylets", object_id: "arrival", payload: scene("arrival", { title: "Edit" }) }])).toEqual([]);
  });
  it("blocks impossible causal gates, missing targets, and planning cycles", () => {
    const manifest = baseline();
    manifest.storylets.push(scene("sequel", { requires_unused: true, default_next_key: "missing", requirements: { requires_storylets: ["arrival"], excludes_storylets: ["arrival"] } }));
    manifest.plans = [{ id: "a", parent_id: "b" }, { id: "b", parent_id: "a" }];
    const errors = validateManifest(manifest).filter((issue) => issue.severity === "error");
    expect(errors.some((issue) => /contradict/.test(issue.message))).toBe(true);
    expect(errors.some((issue) => /Next scene/.test(issue.message))).toBe(true);
    expect(errors.some((issue) => /cycle/.test(issue.message))).toBe(true);
  });
  it("rejects a prerequisite which first becomes available after the sequel expires", () => {
    const manifest = baseline();
    manifest.storylets[0].due_offset_days = 3;
    manifest.storylets.push(scene("early_callback", { requirements: { requires_storylets: ["arrival"] } }));
    expect(validateManifest(manifest).some((issue) => /starts after/.test(issue.message))).toBe(true);
  });
  it("runs saved late-entry and no-replay cases through the game selector", () => {
    const manifest = baseline();
    manifest.storylets.push(scene("late_intro", { due_offset_days: 1, expires_after_days: 2, requirements: { excludes_storylets: ["arrival"] } }));
    manifest.scenarios = [{ id: "test", title: "Skipped arrival", day: 1, segment: "morning", resolved: {}, choices: {}, flags: [], skills: [], precluded: [], expected: ["late_intro"], forbidden: ["arrival"] }];
    expect(runStudioScenarios(manifest)[0]).toMatchObject({ passed: true, offered: ["late_intro"] });
    manifest.scenarios[0].expected = ["arrival"];
    expect(runStudioScenarios(manifest)[0].passed).toBe(false);
  });
  it("rejects broken arc links and missing forbidden offers instead of claiming a pass", () => {
    const manifest = baseline();
    manifest.plans = [{ id: "arc", title: "Arc", storylet_ids: ["deleted"] }];
    expect(validateManifest(manifest).some((issue) => /Linked storylet deleted/.test(issue.message))).toBe(true);
    manifest.scenarios = [{ id: "test", title: "Stale assertion", day: 1, segment: "morning", resolved: {}, choices: {}, flags: [], skills: [], precluded: [], expected: [], forbidden: ["deleted"] }];
    expect(runStudioScenarios(manifest)[0]).toMatchObject({ passed: false });
  });
  it("treats concurrent deletion and modification as a conflict", () => {
    const base = baseline();
    const removal = { kind: "storylets" as const, object_id: "arrival", payload: null };
    const updated = overlayManifest(base, [{ ...removal, payload: scene("arrival", { body: "New prose" }) }]);
    expect(rebaseConflicts(base, updated, [removal])).toEqual(["storylets:arrival"]);
    expect(overlayManifest(updated, [removal]).storylets).toEqual([]);
  });

});
