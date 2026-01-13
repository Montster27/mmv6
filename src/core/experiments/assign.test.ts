import { describe, expect, it } from "vitest";

import { chooseVariant, hashToIndex } from "@/core/experiments/assign";

describe("experiments assignment", () => {
  it("hashToIndex stays within range", () => {
    const idx = hashToIndex("u:exp", 3);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(3);
  });

  it("chooseVariant is deterministic", () => {
    const variants = ["A", "B", "C"];
    const first = chooseVariant("user-1", "exp-1", variants);
    const second = chooseVariant("user-1", "exp-1", variants);
    expect(first).toBe(second);
  });
});
