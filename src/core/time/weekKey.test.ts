import { describe, expect, it } from "vitest";

import { weekKey } from "@/core/time/weekKey";

describe("weekKey", () => {
  it("computes ISO week for year start", () => {
    expect(weekKey(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
  });

  it("handles year boundary weeks", () => {
    expect(weekKey(new Date("2025-12-31T12:00:00Z"))).toBe("2026-W01");
  });
});
