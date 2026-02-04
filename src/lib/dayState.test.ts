import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let maybeSingleResponses: Array<{ data: any; error: any }> = [];
  const insertPayloads: Array<{ table: string; payload: any }> = [];

  const builder: any = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleResponses.shift() ?? { data: null, error: null }),
    insert: vi.fn(async (payload: any) => {
      insertPayloads.push({ table: builder.table, payload });
      return { error: null };
    }),
    then: (resolve: any) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      builder.table = table;
      return builder;
    }),
  };

  return {
    supabase,
    builder,
    setMaybeSingleResponses: (responses: Array<{ data: any; error: any }>) => {
      maybeSingleResponses = [...responses];
    },
    getInsertPayloads: () => insertPayloads,
    reset: () => {
      maybeSingleResponses = [];
      insertPayloads.length = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { ensureDayStateUpToDate } from "@/lib/dayState";

describe("dayState", () => {
  it("returns existing day state without overwriting", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      {
        data: {
          user_id: "u",
          day_index: 2,
          energy: 80,
          stress: 10,
          cashOnHand: 0,
          knowledge: 0,
          socialLeverage: 0,
          physicalResilience: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const result = await ensureDayStateUpToDate("u", 2);
    expect(result.energy).toBe(80);
    expect(result.cashOnHand).toBe(0);
    expect(result.knowledge).toBe(0);
    expect(mockState.getInsertPayloads().length).toBe(0);
  });

  it("creates a day state from the previous day", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: null, error: null },
      {
        data: {
          user_id: "u",
          day_index: 1,
          energy: 120,
          stress: -5,
          cashOnHand: 5,
          knowledge: 3,
          socialLeverage: 2,
          physicalResilience: 45,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      },
      {
        data: {
          user_id: "u",
          day_index: 2,
          energy: 100,
          stress: 0,
          cashOnHand: 5,
          knowledge: 3,
          socialLeverage: 2,
          physicalResilience: 45,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const result = await ensureDayStateUpToDate("u", 2);
    expect(result.energy).toBe(100);
    expect(result.stress).toBe(0);
    expect(result.cashOnHand).toBe(5);
    expect(result.knowledge).toBe(3);

    const inserts = mockState.getInsertPayloads();
    expect(inserts.length).toBe(1);
    expect(inserts[0].table).toBe("player_day_state");
    expect(inserts[0].payload).toMatchObject({
      user_id: "u",
      day_index: 2,
      energy: 100,
      stress: 0,
      money: 5,
      study_progress: 3,
      social_capital: 2,
      health: 45,
    });
  });
});
