import { describe, expect, it } from "vitest";
import { buildArcMap } from "./arcMap";

const scene = (id: string, extra: Record<string, unknown> = {}) => ({ id, storylet_key: id, track_id: "t", title: id, due_offset_days: 0, expires_after_days: 0, segment: "morning", requirements: {}, choices: [], ...extra });

describe("buildArcMap", () => {
  it("places scenes by day and part of day", () => {
    const map = buildArcMap([scene("c", { due_offset_days: 2 }), scene("a"), scene("b", { segment: "evening" })]);
    const at = (id: string) => map.nodes.find((n) => n.id === id)!;
    expect(at("a").x).toBe(at("b").x);
    expect(at("b").y).toBeGreaterThan(at("a").y);
    expect(at("c").x).toBeGreaterThan(at("a").x);
    expect(map.width).toBeGreaterThan(at("c").x);
  });
  it("draws prerequisites, follow-ups, flags and exclusions between scenes of the arc", () => {
    const map = buildArcMap([
      scene("a", { choices: [{ id: "x", label: "X", sets_flag: ["spoke_to_him"], next_key: "b" }] }),
      scene("b", { due_offset_days: 1, requirements: { requires_storylets: ["a"], requires_flag: "spoke_to_him" } }),
      scene("c", { due_offset_days: 1, requirements: { excludes_storylets: ["a"] } }),
    ]);
    const kinds = map.edges.map((e) => `${e.kind}:${e.from}>${e.to}`).sort();
    expect(kinds).toEqual(["excludes:a>c", "flag:a>b", "next:a>b", "requires:a>b"]);
    expect(map.edges.find((e) => e.kind === "flag")!.label).toBe("spoke to him");
  });
  it("ignores references to scenes outside the arc and never links a scene to itself", () => {
    const map = buildArcMap([scene("a", { requirements: { requires_storylets: ["elsewhere", "a"] } })]);
    expect(map.edges).toEqual([]);
    expect(buildArcMap([]).nodes).toEqual([]);
  });
});
