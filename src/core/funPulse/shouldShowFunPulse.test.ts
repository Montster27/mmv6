import { describe, expect, it } from "vitest";

import { shouldShowFunPulse } from "@/core/funPulse/shouldShowFunPulse";

describe("shouldShowFunPulse", () => {
  it("shows on every 3rd day after day 0", () => {
    expect(shouldShowFunPulse(0, 1)).toBe(false);
    expect(shouldShowFunPulse(1, 1)).toBe(false);
    expect(shouldShowFunPulse(2, 1)).toBe(false);
    expect(shouldShowFunPulse(3, 1)).toBe(true);
    expect(shouldShowFunPulse(4, 1)).toBe(false);
    expect(shouldShowFunPulse(6, 1)).toBe(true);
  });
});
