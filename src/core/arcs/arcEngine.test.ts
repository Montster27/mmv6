import { describe, expect, it } from "vitest";

import { getArcNextStepStorylet, type UserArc } from "@/core/arcs/arcEngine";
import type { Storylet, StoryletRun } from "@/types/storylets";

const storylet = (slug: string, id = slug): Storylet => ({
  id,
  slug,
  title: slug,
  body: "",
  choices: [],
  is_active: true,
});

describe("arcEngine", () => {
  it("returns the next arc storylet when eligible", () => {
    const userArc: UserArc = {
      id: "a",
      user_id: "u",
      arc_id: "roommate_v1",
      status: "active",
      step_index: 0,
      started_day_index: 2,
      last_advanced_day_index: null,
    };
    const pool = [storylet("roommate-1"), storylet("other")];
    const next = getArcNextStepStorylet(userArc, 2, pool, [] as StoryletRun[]);
    expect(next?.slug).toBe("roommate-1");
  });

  it("does not return an arc step if already advanced today", () => {
    const userArc: UserArc = {
      id: "a",
      user_id: "u",
      arc_id: "roommate_v1",
      status: "active",
      step_index: 1,
      started_day_index: 2,
      last_advanced_day_index: 3,
    };
    const pool = [storylet("roommate-2")];
    const next = getArcNextStepStorylet(userArc, 3, pool, [] as StoryletRun[]);
    expect(next).toBeNull();
  });
});
