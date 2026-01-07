import { describe, expect, it } from "vitest";
import type { StoryletRun, Storylet } from "@/types/storylets";
import { _testOnly } from "./dailyLoop";

const storyletA: Storylet = {
  id: "a",
  slug: "a",
  title: "A",
  body: "",
  choices: [],
  is_active: true,
};

const storyletB: Storylet = { ...storyletA, id: "b", slug: "b", title: "B" };
const storyletC: Storylet = { ...storyletA, id: "c", slug: "c", title: "C" };

describe("dailyLoop helpers", () => {
  it("filters runs for the selected storylet pair", () => {
    const runs: StoryletRun[] = [
      { id: "1", storylet_id: "c", user_id: "u", day_index: 1, choice_id: "x" },
    ];
    const filtered = _testOnly.runsForTodayPair(runs, [storyletA, storyletB]);
    expect(filtered.length).toBe(0);
  });

  it("includes runs that match the storylet pair", () => {
    const runs: StoryletRun[] = [
      { id: "1", storylet_id: "a", user_id: "u", day_index: 1, choice_id: "x" },
    ];
    const filtered = _testOnly.runsForTodayPair(runs, [storyletA, storyletB]);
    expect(filtered.length).toBe(1);
  });

  it("computes storylet_2 stage for one completed run", () => {
    const stage = _testOnly.computeStage(true, 1, false, true, true, false, false, false);
    expect(stage).toBe("storylet_2");
  });
});
