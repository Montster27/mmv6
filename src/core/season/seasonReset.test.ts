import { describe, expect, it } from "vitest";

import { _testOnly } from "@/core/season/seasonReset";

describe("seasonReset helpers", () => {
  it("picks the season when today is on the boundary", () => {
    const seasons = [
      { season_index: 1, starts_at: "2024-01-01", ends_at: "2024-01-28" },
      { season_index: 2, starts_at: "2024-01-29", ends_at: "2024-02-25" },
    ];

    expect(_testOnly.pickSeasonIndex(seasons, "2024-01-01")).toBe(1);
    expect(_testOnly.pickSeasonIndex(seasons, "2024-01-28")).toBe(1);
    expect(_testOnly.pickSeasonIndex(seasons, "2024-01-29")).toBe(2);
  });

  it("builds the baseline daily reset payload", () => {
    const payload = _testOnly.buildResetPayload("2024-03-01");
    expect(payload.day_index).toBe(0);
    expect(payload.energy).toBe(100);
    expect(payload.stress).toBe(0);
    expect(payload.vectors).toEqual({});
    expect(payload.start_date).toBe("2024-03-01");
    expect(payload.last_day_completed).toBeNull();
    expect(payload.last_day_index_completed).toBeNull();
  });
});
