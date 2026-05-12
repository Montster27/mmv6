import { describe, it, expect } from "vitest";
import { getScriptModeGaps, defaultEditorTab } from "./getScriptModeGaps";
import type { Storylet } from "@/types/storylets";

function makeStorylet(overrides: Partial<Storylet> = {}): Storylet {
  return {
    id: "test-id",
    slug: "test-slug",
    storylet_key: null,
    title: "Test Storylet",
    body: "Body text.",
    choices: [],
    is_active: true,
    tags: [],
    requirements: {},
    weight: 100,
    track_id: null,
    default_next_key: null,
    segment: null,
    due_offset_days: null,
    nodes: null,
    ...overrides,
  } as Storylet;
}

describe("getScriptModeGaps", () => {
  it("returns empty array for a pure script-mode storylet", () => {
    const sl = makeStorylet();
    expect(getScriptModeGaps(sl)).toEqual([]);
  });

  it("flags non-empty requirements", () => {
    const sl = makeStorylet({ requirements: { min_day_index: 3 } });
    expect(getScriptModeGaps(sl)).toContain("requirements");
  });

  it("flags empty-object requirements as clean", () => {
    const sl = makeStorylet({ requirements: {} });
    expect(getScriptModeGaps(sl)).not.toContain("requirements");
  });

  it("flags default_next_key when set", () => {
    const sl = makeStorylet({ default_next_key: "some_next" });
    expect(getScriptModeGaps(sl)).toContain("default_next_key");
  });

  it("flags track_id when set", () => {
    const sl = makeStorylet({ track_id: "arc-uuid" });
    expect(getScriptModeGaps(sl)).toContain("track_id");
  });

  it("flags non-empty tags array", () => {
    const sl = makeStorylet({ tags: ["intro_hook"] });
    expect(getScriptModeGaps(sl)).toContain("tags");
  });

  it("does not flag empty tags array", () => {
    const sl = makeStorylet({ tags: [] });
    expect(getScriptModeGaps(sl)).not.toContain("tags");
  });

  it("flags non-default weight", () => {
    const sl = makeStorylet({ weight: 200 });
    expect(getScriptModeGaps(sl)).toContain("weight");
  });

  it("does not flag weight of 100", () => {
    const sl = makeStorylet({ weight: 100 });
    expect(getScriptModeGaps(sl)).not.toContain("weight");
  });

  it("accumulates multiple gaps", () => {
    const sl = makeStorylet({
      track_id: "arc-uuid",
      tags: ["intro_hook"],
      weight: 50,
    });
    const gaps = getScriptModeGaps(sl);
    expect(gaps).toContain("track_id");
    expect(gaps).toContain("tags");
    expect(gaps).toContain("weight");
    expect(gaps).toHaveLength(3);
  });
});

describe("defaultEditorTab", () => {
  it("returns script for a storylet with no track_id", () => {
    expect(defaultEditorTab(makeStorylet())).toBe("script");
  });

  it("returns structured for a storylet with a track_id", () => {
    expect(defaultEditorTab(makeStorylet({ track_id: "some-id" }))).toBe("structured");
  });
});
