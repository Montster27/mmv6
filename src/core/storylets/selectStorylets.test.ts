import { describe, expect, it } from "vitest";

import { selectStorylets } from "@/core/storylets/selectStorylets";
import type { Storylet, StoryletRun } from "@/types/storylets";
import type { DailyState } from "@/types/daily";

function makeStorylet(
  id: string,
  overrides: Partial<Storylet> = {}
): Storylet {
  return {
    id,
    slug: id,
    title: id,
    body: "",
    choices: [],
    is_active: true,
    weight: 100,
    tags: [],
    requirements: {},
    ...overrides,
  };
}

const baseState: DailyState = {
  id: "d",
  user_id: "u",
  day_index: 2,
  energy: 50,
  stress: 50,
  vectors: {},
};

describe("selectStorylets", () => {
  it("is deterministic for the same inputs", () => {
    const storylets = [makeStorylet("a"), makeStorylet("b"), makeStorylet("c")];
    const args = {
      seed: "user-1-2",
      dayIndex: 2,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [] as StoryletRun[],
    };

    const first = selectStorylets(args).map((s) => s.id);
    const second = selectStorylets(args).map((s) => s.id);
    expect(first).toEqual(second);
  });

  it("returns exactly two when enough storylets exist", () => {
    const storylets = [makeStorylet("a"), makeStorylet("b"), makeStorylet("c")];
    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    expect(selected).toHaveLength(2);
  });

  it("skips inactive storylets when active options exist", () => {
    const storylets = [
      makeStorylet("a", { is_active: false }),
      makeStorylet("b"),
      makeStorylet("c"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    const ids = selected.map((s) => s.id);
    expect(ids).not.toContain("a");
  });

  it("avoids reusing storylets already used today", () => {
    const storylets = [makeStorylet("a"), makeStorylet("b"), makeStorylet("c")];
    const recentRuns: StoryletRun[] = [
      { id: "r1", user_id: "u", day_index: 2, storylet_id: "a", choice_id: "x" },
    ];

    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 2,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns,
    });

    const ids = selected.map((s) => s.id);
    expect(ids).not.toContain("a");
  });

  it("prefers onboarding storylets early in the run", () => {
    const storylets = [
      makeStorylet("onboard-1", { tags: ["onboarding"] }),
      makeStorylet("onboard-2", { tags: ["onboarding"] }),
      makeStorylet("other"),
    ];

    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 2,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });

    expect(selected.every((s) => (s.tags ?? []).includes("onboarding"))).toBe(true);
  });

  it("includes a forced storylet as the first pick when eligible", () => {
    const forced = makeStorylet("forced");
    const storylets = [forced, makeStorylet("b"), makeStorylet("c")];
    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
      forcedStorylet: forced,
    });
    expect(selected[0]?.id).toBe("forced");
    expect(selected).toHaveLength(2);
  });

  it("respects season allowlist when possible", () => {
    const storylets = [
      makeStorylet("season-1", {
        requirements: { seasons_any: [1] },
      }),
      makeStorylet("season-2", {
        requirements: { seasons_any: [2] },
      }),
      makeStorylet("neutral"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    const ids = selected.map((s) => s.id);
    expect(ids).toContain("season-1");
  });

  it("falls back when season gating reduces the pool", () => {
    const storylets = [
      makeStorylet("season-2", { requirements: { min_season_index: 2 } }),
      makeStorylet("season-2b", { requirements: { min_season_index: 2 } }),
      makeStorylet("neutral"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    expect(selected).toHaveLength(2);
  });
});
