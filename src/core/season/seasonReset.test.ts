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
});
