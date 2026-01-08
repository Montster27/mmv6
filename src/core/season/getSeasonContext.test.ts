import { describe, expect, it } from "vitest";

import { _testOnly } from "@/core/season/getSeasonContext";

describe("getSeasonContext helpers", () => {
  it("computes days remaining with UTC boundaries", () => {
    expect(_testOnly.computeDaysRemaining("2024-02-01", "2024-02-01")).toBe(0);
    expect(_testOnly.computeDaysRemaining("2024-02-02", "2024-02-01")).toBe(1);
    expect(_testOnly.computeDaysRemaining("2024-02-03", "2024-02-01")).toBe(2);
  });
});
