import assert from "node:assert/strict";
import { selectStorylets, _testOnly } from "./selectStorylets";
import type { Storylet, StoryletRun } from "@/types/storylets";

const baseStorylet = {
  slug: "",
  body: "",
  choices: [],
  is_active: true,
} as Storylet;

const s1: Storylet = { ...baseStorylet, id: "s1", title: "S1" };
const s2: Storylet = { ...baseStorylet, id: "s2", title: "S2" };
const s3: Storylet = { ...baseStorylet, id: "s3", title: "S3", tags: ["onboarding"] };

(() => {
  const res = selectStorylets({
    seed: "user-1-1",
    dayIndex: 1,
    dailyState: null,
    allStorylets: [s1, s2],
    recentRuns: [],
  });
  const res2 = selectStorylets({
    seed: "user-1-1",
    dayIndex: 1,
    dailyState: null,
    allStorylets: [s1, s2],
    recentRuns: [],
  });
  assert.deepEqual(res.map((r) => r.id), res2.map((r) => r.id));
})();

(() => {
  const res = selectStorylets({
    seed: "user-1-1",
    dayIndex: 1,
    dailyState: null,
    allStorylets: [s1, s2, s3],
    recentRuns: [],
  });
  assert.equal(res[0].id, "s3");
})();

(() => {
  const runs: StoryletRun[] = [
    { id: "r1", storylet_id: "s1", user_id: "u", day_index: 1, choice_id: "c" },
  ];
  const res = selectStorylets({
    seed: "user-1-1",
    dayIndex: 1,
    dailyState: null,
    allStorylets: [s1, s2],
    recentRuns: runs,
  });
  assert.equal(res[0].id !== "s1", true);
})();

(() => {
  const meets = _testOnly.meetsRequirements(
    { ...s1, requirements: { min_day_index: 3 } },
    2,
    null
  );
  assert.equal(meets, false);
})();

console.log("selectStorylets tests passed");
