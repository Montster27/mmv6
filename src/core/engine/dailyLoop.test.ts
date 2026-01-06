import assert from "node:assert/strict";
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

(() => {
  const runs: StoryletRun[] = [
    { id: "1", storylet_id: "c", user_id: "u", day_index: 1, choice_id: "x" },
  ];
  const filtered = _testOnly.runsForTodayPair(runs, [storyletA, storyletB]);
  assert.equal(filtered.length, 0);
})();

(() => {
  const runs: StoryletRun[] = [
    { id: "1", storylet_id: "a", user_id: "u", day_index: 1, choice_id: "x" },
  ];
  const filtered = _testOnly.runsForTodayPair(runs, [storyletA, storyletB]);
  assert.equal(filtered.length, 1);
})();

(() => {
  const stage = _testOnly.computeStage(true, 1, false, true, true);
  assert.equal(stage, "storylet_2");
})();

console.log("dailyLoop tests passed");
