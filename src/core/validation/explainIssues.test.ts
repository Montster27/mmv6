import { describe, expect, it } from "vitest";
import type { Storylet } from "@/types/storylets";
import { applyAllFixes, guidedIssues } from "./explainIssues";

const scene = (choices: Record<string, unknown>[]): Storylet =>
  ({ id: "s1", slug: "s1", title: "A scene", body: "Some body text.", choices, tags: [], requirements: {}, weight: 1, is_active: true } as unknown as Storylet);

describe("guided validation", () => {
  it("explains missing precludes and tags in plain language and offers a safe fix", () => {
    const s = scene([{ id: "a", label: "Look up", reaction_text: "You look up." }]);
    const issues = guidedIssues(s);
    const titles = issues.map((i) => i.title);
    expect(titles).toContain("Say whether this choice closes anything off");
    expect(titles).toContain("Say what kind of choice this is");
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
    expect(issues.find((i) => /closes anything off/.test(i.title))!.where).toBe("Choice 1 (“Look up”)");
    const fixed = applyAllFixes(s);
    expect(guidedIssues(fixed)).toEqual([]);
    expect(fixed.choices[0].precludes).toEqual([]);
    expect(fixed.choices[0].identity_tags).toEqual(["safety"]);
  });

  it("flags unknown kinds like 'curiosity' without blocking a save", () => {
    const s = scene([{ id: "a", label: "Walk", reaction_text: "You walk.", identity_tags: ["curiosity"], precludes: [] }]);
    const issues = guidedIssues(s);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].title).toMatch(/one of the four/);
  });

  it("warns when a choice shows the player nothing, and never auto-writes prose", () => {
    const s = scene([{ id: "a", label: "Nod", identity_tags: ["people"], precludes: [] }]);
    const [issue] = guidedIssues(s);
    expect(issue.title).toMatch(/what the player reads/);
    expect(issue.fix).toBeUndefined();
  });

  it("keeps real errors as errors", () => {
    const s = { ...scene([]), title: "", body: "" } as Storylet;
    const errors = guidedIssues(s).filter((i) => i.severity === "error").map((i) => i.title);
    expect(errors).toEqual(expect.arrayContaining(["Give the scene a title", "Write the scene text", "Add at least one choice"]));
  });
});
