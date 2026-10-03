import { describe, expect, it } from "vitest";
import { emptyManifest, validateManifest } from "./manifest";
import { validateAgreements, type FactUse } from "./agreements";
import { planningImpact } from "./planning";
import type { StudioManifest, StudioRecord } from "@/types/studio";
function fixture(): StudioManifest {
  return { ...emptyManifest(), tracks: [{ id: "clock", key: "academic", title: "Academic" }], definitions: [
    { id: "attendance", kind: "fact", title: "Accepted study invitation", fact_schema: { type: "boolean", default_known: false } },
    { id: "priya", kind: "npc", title: "Priya" },
    { id: "library", kind: "location", title: "Library" },
    { id: "floor", kind: "location", title: "Floor lounge" },
  ] };
}
function event(id: string, location: string, conditions: FactUse[] = [], extra: StudioRecord = {}): StudioRecord {
  return { id, title: id, kind: "calendar", reservation: { track_id: "clock", day: 4, start_hour: 14, end_hour: 16, npc_ids: ["priya"], location_id: location, conditions, ...extra } };
}
describe("declared narrative agreements", () => {
  it("distinguishes an unknown default from a known false value", () => {
    const manifest = fixture();
    expect(validateAgreements(manifest)).toEqual([]);
    manifest.definitions[0].fact_schema = { type: "boolean", default_known: true, default_value: false };
    expect(validateAgreements(manifest)).toEqual([]);
    manifest.definitions[0].fact_schema = { type: "boolean", default_known: true, default_value: "false" };
    expect(validateAgreements(manifest)[0].message).toMatch(/Known default/);
  });
  it("blocks invalid named values and mismatched consumers", () => {
    const manifest = fixture();
    manifest.definitions[0].fact_schema = { type: "enum", values: ["accepted", "declined"], default_known: false };
    manifest.plans = [{ id: "arc", fact_uses: [{ definition_id: "attendance", mode: "requires", value: "maybe" }] }];
    expect(validateManifest(manifest).some((issue) => /does not match/.test(issue.message))).toBe(true);
    manifest.definitions[0].fact_schema = { type: "enum", values: ["accepted", "accepted"], default_known: false };
    expect(validateAgreements(manifest).some((issue) => /distinct/.test(issue.message))).toBe(true);
  });
  it("rejects impossible entry assumptions but permits different possible outputs", () => {
    const manifest = fixture();
    manifest.plans = [{ id: "arc", fact_uses: [true,false].map((value) => ({ definition_id: "attendance", mode: "requires", value })) }];
    expect(validateAgreements(manifest)[0].message).toMatch(/incompatible/);
    manifest.plans[0].fact_uses = [true,false].map((value) => ({ definition_id: "attendance", mode: "establishes", value }));
    expect(validateAgreements(manifest)).toEqual([]);
  });
  it("blocks a definite NPC double-booking at different locations", () => {
    const manifest = fixture(); manifest.definitions.push(event("meeting", "library"), event("party", "floor"));
    expect(validateAgreements(manifest)).toEqual([expect.objectContaining({ severity: "error", objectId: "party", message: expect.stringContaining("Priya is booked") })]);
  });
  it("does not report a collision between mutually exclusive branches", () => {
    const manifest = fixture();
    manifest.definitions.push(event("meeting", "library", [{ definition_id: "attendance", mode: "requires", value: true }]), event("party", "floor", [{ definition_id: "attendance", mode: "requires", value: false }]));
    expect(validateAgreements(manifest)).toEqual([]);
  });
  it("flags uncertain overlap, and permits touching time boundaries", () => {
    const manifest = fixture();
    manifest.definitions.push(event("meeting", "library", [{ definition_id: "attendance", mode: "requires", value: true }]), event("party", "floor"));
    expect(validateAgreements(manifest)[0].severity).toBe("warning");
    manifest.definitions[5] = event("party", "floor", [], { start_hour: 16, end_hour: 18 });
    expect(validateAgreements(manifest)).toEqual([]);
  });
  it("does not claim proof when events use different track clocks", () => {
    const manifest = fixture(); manifest.tracks.push({ id: "other", key: "belonging" });
    manifest.definitions.push(event("meeting", "library"), event("party", "floor", [], { track_id: "other" }));
    expect(validateAgreements(manifest)).toEqual([expect.objectContaining({ severity: "warning", message: expect.stringContaining("different track clocks") })]);
  });
  it("includes typed fact links in the dependent writer’s impact review", () => {
    const manifest = fixture(); manifest.plans = [{ id: "arc", fact_uses: [{ definition_id: "attendance", mode: "requires", value: true }] }];
    const current = structuredClone(manifest); current.definitions[0].meaning = "Attendance confirmed, not merely invited";
    expect(planningImpact(manifest,current,[],"arc").map((impact) => impact.id)).toEqual(["definitions:attendance"]);
    current.definitions = current.definitions.filter((row) => row.id !== "attendance");
    expect(validateAgreements(current)[0].message).toMatch(/missing or untyped/);
  });
  it("rejects invalid windows and broken participants", () => {
    const manifest = fixture(); manifest.definitions.push(event("meeting", "library", [], { start_hour: 17, end_hour: 16 }));
    expect(validateAgreements(manifest)[0].severity).toBe("error");
    manifest.definitions[4] = event("meeting", "library", [], { npc_ids: ["unknown"] });
    expect(validateAgreements(manifest)[0].message).toMatch(/participants/);
  });
});
