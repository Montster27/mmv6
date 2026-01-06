import { describe, expect, it } from "vitest";

import { applyOutcomeToDailyState } from "@/core/engine/applyOutcome";
import type { DailyState } from "@/types/daily";
import type { StoryletChoice } from "@/types/storylets";

const baseState: DailyState = {
  id: "d",
  user_id: "u",
  day_index: 1,
  energy: 95,
  stress: 5,
  vectors: { social: 99 },
};

describe("applyOutcomeToDailyState", () => {
  it("applies deltas and clamps values", () => {
    const outcome: StoryletChoice["outcome"] = {
      text: "ok",
      deltas: {
        energy: 10,
        stress: -10,
        vectors: { social: 5, focus: -3 },
      },
    };

    const result = applyOutcomeToDailyState(baseState, outcome);
    expect(result.nextDailyState.energy).toBe(100);
    expect(result.nextDailyState.stress).toBe(0);
    expect(result.nextDailyState.vectors).toMatchObject({
      social: 100,
      focus: 0,
    });
  });

  it("handles missing outcome safely", () => {
    const result = applyOutcomeToDailyState(baseState, undefined);
    expect(result.nextDailyState).toBe(baseState);
    expect(result.appliedDeltas).toEqual({});
  });
});
