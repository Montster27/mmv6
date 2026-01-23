import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let maybeSingleQueue: Array<{ data: any; error: any }> = [];
  let selectQueue: Array<{ data: any; error: any }> = [];
  const insertPayloads: Array<{ table: string; payload: any }> = [];

  const builder: any = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleQueue.shift() ?? { data: null, error: null }),
    insert: vi.fn(async (payload: any) => {
      insertPayloads.push({ table: builder.table, payload });
      return { error: null };
    }),
    then: (resolve: any) =>
      Promise.resolve(selectQueue.shift() ?? { data: [], error: null }).then(resolve),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      builder.table = table;
      return builder;
    }),
  };

  return {
    supabase,
    setMaybeSingleResponses: (responses: Array<{ data: any; error: any }>) => {
      maybeSingleQueue = [...responses];
    },
    setSelectResponses: (responses: Array<{ data: any; error: any }>) => {
      selectQueue = [...responses];
    },
    getInsertPayloads: () => insertPayloads,
    reset: () => {
      maybeSingleQueue = [];
      selectQueue = [];
      insertPayloads.length = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import {
  computeWeekWindow,
  getOrComputeCohortWeeklyInfluence,
  getOrComputeWorldWeeklyInfluence,
} from "@/lib/worldState";

describe("worldState", () => {
  it("computes week window", () => {
    expect(computeWeekWindow(8)).toEqual({ weekStart: 7, weekEnd: 13 });
  });

  it("returns existing world influence without insert", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: { influence: { neo_assyrian: 2 } }, error: null },
    ]);

    const result = await getOrComputeWorldWeeklyInfluence(1, 7);
    expect(result.neo_assyrian).toBe(2);
    expect(mockState.getInsertPayloads().length).toBe(0);
  });

  it("aggregates cohort influence from members only", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([{ data: null, error: null }]);
    mockState.setSelectResponses([
      { data: [{ user_id: "u1" }, { user_id: "u2" }], error: null },
      {
        data: [
          { faction_key: "neo_assyrian", delta: 2 },
          { faction_key: "neo_assyrian", delta: 1 },
          { faction_key: "templar_remnant", delta: 1 },
        ],
        error: null,
      },
    ]);

    const influence = await getOrComputeCohortWeeklyInfluence("c1", 1, 7);
    expect(influence.neo_assyrian).toBe(3);
    expect(influence.templar_remnant).toBe(1);
  });
});
