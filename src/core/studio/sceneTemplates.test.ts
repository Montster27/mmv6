import { describe, expect, it } from "vitest";
import type { Storylet } from "@/types/storylets";
import { guidedIssues } from "@/core/validation/explainIssues";
import { EXAMPLE_MARKER, newSceneRecord, SCENE_TEMPLATES, slugify, uniqueSceneKey } from "./sceneTemplates";

describe("scene templates", () => {
  it("every template choice already follows the project rules", () => {
    for (const template of SCENE_TEMPLATES.filter((t) => t.id !== "blank")) {
      const scene = { id: "x", slug: "x", title: template.title, body: template.body, choices: template.choices, requirements: {}, tags: [], weight: 1, is_active: true } as unknown as Storylet;
      const titles = guidedIssues(scene).map((i) => i.title);
      // The only thing left to do is replace the example text.
      expect(titles).toEqual(["Replace the example text with your own"]);
      expect(template.body.startsWith(EXAMPLE_MARKER)).toBe(true);
    }
  });
  it("example text is flagged until replaced", () => {
    const t = SCENE_TEMPLATES[0];
    const scene = { id: "x", slug: "x", title: t.title, body: t.body.replace(EXAMPLE_MARKER, "").trim(), choices: t.choices, requirements: {}, tags: [], weight: 1, is_active: true } as unknown as Storylet;
    expect(guidedIssues(scene)).toEqual([]);
  });
  it("makes safe, unique keys", () => {
    expect(slugify("The  Hall Phone!")).toBe("the_hall_phone");
    expect(slugify("???")).toBe("new_scene");
    expect(uniqueSceneKey("The Hall Phone", ["the_hall_phone", "the_hall_phone_2"])).toBe("the_hall_phone_3");
  });
  it("builds a scene record the Studio accepts", () => {
    const record = newSceneRecord({ title: " A title ", body: " Body. ", choices: SCENE_TEMPLATES[0].choices, trackId: "t1", trackKey: "roommate", segment: "evening", day: 1, windowDays: 2, orderIndex: 5, takenKeys: [] });
    expect(record).toMatchObject({ slug: "a_title", storylet_key: "a_title", title: "A title", body: "Body.", track_id: "t1", segment: "evening", due_offset_days: 1, expires_after_days: 2, is_active: true });
  });
});
