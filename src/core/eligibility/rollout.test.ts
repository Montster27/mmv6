import { describe, expect, it } from "vitest";

import { pctInRollout } from "@/core/eligibility/rollout";

describe("pctInRollout", () => {
  it("respects 0 and 100 bounds", () => {
    expect(pctInRollout("u", "s", 0)).toBe(false);
    expect(pctInRollout("u", "s", 100)).toBe(true);
  });

  it("is deterministic for the same inputs", () => {
    const first = pctInRollout("u", "s", 25);
    const second = pctInRollout("u", "s", 25);
    expect(first).toBe(second);
  });
});
