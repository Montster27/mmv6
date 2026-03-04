import { describe, expect, it } from "vitest";

import { selectStorylets, _testOnly } from "@/core/storylets/selectStorylets";
import type { StoryletContext } from "@/core/engine/storyletContext";
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
      userId: "user-1",
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

  it("returns up to three when enough storylets exist", () => {
    const storylets = [makeStorylet("a"), makeStorylet("b"), makeStorylet("c")];
    const selected = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    expect(selected.length).toBeGreaterThanOrEqual(2);
    expect(selected.length).toBeLessThanOrEqual(3);
  });

  it("skips inactive storylets when active options exist", () => {
    const storylets = [
      makeStorylet("a", { is_active: false }),
      makeStorylet("b"),
      makeStorylet("c"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      userId: "user-1",
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
      userId: "user-1",
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
      userId: "user-1",
      dayIndex: 2,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });

    // Both onboarding storylets should appear; a third slot may be filled by "other"
    const ids = selected.map((s) => s.id);
    expect(ids).toContain("onboard-1");
    expect(ids).toContain("onboard-2");
  });

  it("includes a forced storylet as the first pick when eligible", () => {
    const forced = makeStorylet("forced");
    const storylets = [forced, makeStorylet("b"), makeStorylet("c")];
    const selected = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
      forcedStorylet: forced,
    });
    expect(selected[0]?.id).toBe("forced");
    expect(selected.length).toBeGreaterThanOrEqual(2);
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
      userId: "user-1",
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
      userId: "user-1",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    // At least the neutral storylet should be returned; others may backfill
    expect(selected.length).toBeGreaterThanOrEqual(1);
    expect(selected.some((s) => s.id === "neutral")).toBe(true);
  });

  it("respects rollout audience gating", () => {
    const storylets = [
      makeStorylet("gated", {
        requirements: { audience: { rollout_pct: 0 } },
      }),
      makeStorylet("open"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    });
    const ids = selected.map((s) => s.id);
    expect(ids).toContain("open");
  });

  it("allows admin audience override", () => {
    const storylets = [
      makeStorylet("admin-only", {
        requirements: { audience: { rollout_pct: 0, allow_admin: true } },
      }),
      makeStorylet("open"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
      isAdmin: true,
    });
    const ids = selected.map((s) => s.id);
    expect(ids).toContain("admin-only");
  });

  it("respects experiment audience gating", () => {
    const storylets = [
      makeStorylet("exp-gated", {
        requirements: {
          audience: {
            experiment: { id: "exp1", variants_any: ["B"] },
          },
        },
      }),
      makeStorylet("open"),
    ];
    const selected = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 4,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
      experiments: { exp1: "B" },
    });
    const ids = selected.map((s) => s.id);
    expect(ids).toContain("exp-gated");
  });

  it("scores social tags higher for connect posture", () => {
    const social = makeStorylet("social", { tags: ["social"] });
    const other = makeStorylet("other", { tags: ["study"] });
    const ctx: StoryletContext = { posture: "connect", unresolvedTensionKeys: [] };
    const scoreSocial = _testOnly.scoreStorylet(social, "seed", ctx);
    const scoreOther = _testOnly.scoreStorylet(other, "seed", ctx);
    expect(scoreSocial).toBeLessThan(scoreOther);
  });

  it("scores study tags higher for unfinished assignment tension", () => {
    const study = makeStorylet("study", { tags: ["study"] });
    const other = makeStorylet("other", { tags: ["social"] });
    const ctx: StoryletContext = {
      posture: null,
      unresolvedTensionKeys: ["unfinished_assignment"],
    };
    const scoreStudy = _testOnly.scoreStorylet(study, "seed", ctx);
    const scoreOther = _testOnly.scoreStorylet(other, "seed", ctx);
    expect(scoreStudy).toBeLessThan(scoreOther);
  });

  // ── max_total_runs ────────────────────────────────────────────────────────

  it("excludes a one-shot storylet after it has been run once", () => {
    const storylets = [
      makeStorylet("one-shot", { requirements: { max_total_runs: 1 } }),
      makeStorylet("repeatable"),
    ];
    const recentRuns: StoryletRun[] = [
      { id: "r1", user_id: "u", day_index: 1, storylet_id: "one-shot", choice_id: "x" },
    ];
    const ids = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 5,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns,
    }).map((s) => s.id);
    expect(ids).not.toContain("one-shot");
    expect(ids).toContain("repeatable");
  });

  it("includes a one-shot storylet if it has never been run", () => {
    const storylets = [
      makeStorylet("one-shot", { requirements: { max_total_runs: 1 } }),
      makeStorylet("filler"),
    ];
    const ids = selectStorylets({
      seed: "seed",
      userId: "user-1",
      dayIndex: 5,
      seasonIndex: 1,
      dailyState: baseState,
      allStorylets: storylets,
      recentRuns: [],
    }).map((s) => s.id);
    expect(ids).toContain("one-shot");
  });

  it("allows a multi-run storylet until the cap is hit", () => {
    const storylets = [
      makeStorylet("capped", { requirements: { max_total_runs: 2 } }),
      makeStorylet("filler"),
    ];
    const oneRun: StoryletRun[] = [
      { id: "r1", user_id: "u", day_index: 1, storylet_id: "capped", choice_id: "x" },
    ];
    const twoRuns: StoryletRun[] = [
      ...oneRun,
      { id: "r2", user_id: "u", day_index: 2, storylet_id: "capped", choice_id: "x" },
    ];

    const afterOne = selectStorylets({
      seed: "seed", userId: "user-1", dayIndex: 5, seasonIndex: 1,
      dailyState: baseState, allStorylets: storylets, recentRuns: oneRun,
    }).map((s) => s.id);
    expect(afterOne).toContain("capped");

    const afterTwo = selectStorylets({
      seed: "seed", userId: "user-1", dayIndex: 5, seasonIndex: 1,
      dailyState: baseState, allStorylets: storylets, recentRuns: twoRuns,
    }).map((s) => s.id);
    expect(afterTwo).not.toContain("capped");
  });

  // ── requires_npc_met ──────────────────────────────────────────────────────

  it("excludes a storylet when a required NPC has not been met", () => {
    const storylets = [
      makeStorylet("npc-gated", {
        requirements: { requires_npc_met: ["npc_floor_cal"] },
      }),
      makeStorylet("open-a"),
      makeStorylet("open-b"),
    ];
    // Cal is present but met=false
    const stateCalUnmet: DailyState = {
      ...baseState,
      relationships: { npc_floor_cal: { met: false, relationship: 5 } },
    };
    const ids = selectStorylets({
      seed: "seed", userId: "user-1", dayIndex: 5, seasonIndex: 1,
      dailyState: stateCalUnmet, allStorylets: storylets, recentRuns: [],
    }).map((s) => s.id);
    expect(ids).not.toContain("npc-gated");
  });

  it("includes a storylet when a required NPC has been met", () => {
    const storylets = [
      makeStorylet("npc-gated", {
        requirements: { requires_npc_met: ["npc_floor_cal"] },
      }),
      makeStorylet("filler"),
    ];
    const stateCalMet: DailyState = {
      ...baseState,
      relationships: { npc_floor_cal: { met: true, relationship: 6 } },
    };
    const ids = selectStorylets({
      seed: "seed", userId: "user-1", dayIndex: 5, seasonIndex: 1,
      dailyState: stateCalMet, allStorylets: storylets, recentRuns: [],
    }).map((s) => s.id);
    expect(ids).toContain("npc-gated");
  });

  // ── requires_npc_not_met ──────────────────────────────────────────────────

  it("excludes a first-encounter storylet after the NPC has been met", () => {
    const storylets = [
      makeStorylet("first-meet", {
        requirements: { requires_npc_not_met: ["npc_floor_cal"] },
      }),
      makeStorylet("filler-a"),
      makeStorylet("filler-b"),
    ];
    const stateCalMet: DailyState = {
      ...baseState,
      relationships: { npc_floor_cal: { met: true, relationship: 6 } },
    };
    const ids = selectStorylets({
      seed: "seed", userId: "user-1", dayIndex: 5, seasonIndex: 1,
      dailyState: stateCalMet, allStorylets: storylets, recentRuns: [],
    }).map((s) => s.id);
    expect(ids).not.toContain("first-meet");
  });

  it("includes a first-encounter storylet when the NPC has not yet been met", () => {
    const storylets = [
      makeStorylet("first-meet", {
        requirements: { requires_npc_not_met: ["npc_floor_cal"] },
      }),
      makeStorylet("filler"),
    ];
    const stateCalUnmet: DailyState = {
      ...baseState,
      relationships: { npc_floor_cal: { met: false, relationship: 5 } },
    };
    const ids = selectStorylets({
      seed: "seed", userId: "user-1", dayIndex: 5, seasonIndex: 1,
      dailyState: stateCalUnmet, allStorylets: storylets, recentRuns: [],
    }).map((s) => s.id);
    expect(ids).toContain("first-meet");
  });
});
