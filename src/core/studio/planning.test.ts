import { describe, expect, it } from "vitest";
import { emptyManifest } from "./manifest";
import { inheritedBriefs, planningImpact, assertImpactAcknowledged } from "./planning";
function baseline() {
  return { ...emptyManifest(), plans: [
    { id: "direction", title: "Belonging", constraints: "May decline" },
    { id: "strand", title: "Study group", parent_id: "direction", dependencies: ["meeting"] },
    { id: "arc", title: "Invitation", parent_id: "strand", storylet_ids: ["scene"] },
    { id: "unrelated", title: "Home" },
  ], definitions: [{ id: "meeting", title: "Study meeting", timing: "Thursday", dependencies: ["room"] }, { id: "room", title: "Library room", guidance: "Quiet" }] };
}
describe("narrative handoffs", () => {
  it("attributes inherited constraints to their direction, strand, and arc", () => {
    expect(inheritedBriefs(baseline(), "arc").map((row) => row.id)).toEqual(["direction", "strand", "arc"]);
  });
  it("finds transitive changed agreements without disturbing unrelated work", () => {
    const base = baseline(), current = structuredClone(base);
    current.definitions[0].timing = "Friday";
    current.plans[3].title = "Letter from home";
    const impacts = planningImpact(base, current, [], "arc");
    expect(impacts.map((item) => item.id)).toEqual(["definitions:meeting"]);
    expect(impacts[0].path).toEqual(["arc", "strand", "meeting"]);
    expect(impacts[0].fields).toEqual(["timing"]);
  });
  it("detects deleted agreements through the old dependency graph for scene writers", () => {
    const base = baseline(), current = structuredClone(base);
    current.definitions = current.definitions.filter((row) => row.id !== "room");
    const impacts = planningImpact(base, current, [{ kind: "storylets", object_id: "scene", payload: { id: "scene", title: "Edit" } }], null);
    expect(impacts[0]).toMatchObject({ id: "definitions:room", after: null });
  });
  it("ignores bookkeeping changes and terminates malformed cycles", () => {
    const base = baseline(), current = structuredClone(base);
    Object.assign(current.plans[0], { updated_at: "later" });
    Object.assign(base.plans[0], { parent_id: "arc" });
    Object.assign(current.plans[0], { parent_id: "arc" });
    expect(planningImpact(base, current, [], "arc")).toEqual([]);
    expect(inheritedBriefs(base, "arc")).toHaveLength(3);
  });
  it("requires acknowledgement against the exact release being compared", () => {
    const base = baseline(), current = structuredClone(base); current.definitions[0].timing = "Friday";
    const impacts = planningImpact(base, current, [], "arc");
    expect(() => assertImpactAcknowledged(impacts, "new", "new", [])).toThrow(/Study meeting/);
    expect(() => assertImpactAcknowledged(impacts, "new", "old", ["definitions:meeting"])).toThrow(/release changed/);
    expect(() => assertImpactAcknowledged(impacts, "new", "new", ["definitions:meeting"])).not.toThrow();
  });
});
