import { describe, expect, it } from "vitest";

import { chooseWeightedOutcome, hashToUnitFloat } from "@/core/engine/deterministicRoll";
import type { StoryletOutcomeOption } from "@/types/storylets";

const outcomes: StoryletOutcomeOption[] = [
  { id: "a", weight: 1, text: "A" },
  { id: "b", weight: 1, text: "B", modifiers: { vector: "focus", per10: 10 } },
];

describe("deterministicRoll", () => {
  it("returns the same outcome for the same seed", () => {
    const seed = "u:1:s:c";
    const first = chooseWeightedOutcome(seed, outcomes, { focus: 0 });
    const second = chooseWeightedOutcome(seed, outcomes, { focus: 0 });
    expect(first.id).toBe(second.id);
  });

  it("uses vector modifiers to adjust weights", () => {
    const seed = "u:1:s:c";
    const unit = hashToUnitFloat(seed);
    const totalNoModifier = 2;
    const thresholdNoModifier = unit * totalNoModifier;
    const expectedNoModifier = thresholdNoModifier < 1 ? "a" : "b";

    const totalWithModifier = 1 + 101;
    const thresholdWithModifier = unit * totalWithModifier;
    const expectedWithModifier = thresholdWithModifier < 1 ? "a" : "b";

    const noModifier = chooseWeightedOutcome(seed, outcomes, { focus: 0 });
    const withModifier = chooseWeightedOutcome(seed, outcomes, { focus: 100 });

    expect(noModifier.id).toBe(expectedNoModifier);
    expect(withModifier.id).toBe(expectedWithModifier);
  });
});
