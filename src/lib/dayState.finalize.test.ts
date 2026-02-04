import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let maybeSingleResponses: Array<{ data: any; error: any }> = [];
  let selectResponses: Array<{ data: any; error: any }> = [];
  const insertPayloads: Array<{ table: string; payload: any }> = [];
  const updatePayloads: Array<{ table: string; payload: any }> = [];

  const builder: any = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    is: vi.fn(() => builder),
    or: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleResponses.shift() ?? { data: null, error: null }),
    insert: vi.fn(async (payload: any) => {
      insertPayloads.push({ table: builder.table, payload });
      return { error: null };
    }),
    update: vi.fn((payload: any) => {
      updatePayloads.push({ table: builder.table, payload });
      return builder;
    }),
    then: (resolve: any) =>
      Promise.resolve(selectResponses.shift() ?? { data: null, error: null }).then(resolve),
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
    setSelectResponses: (responses: Array<{ data: any; error: any }>) => {
      selectResponses = [...responses];
    },
    getInsertPayloads: () => insertPayloads,
    getUpdatePayloads: () => updatePayloads,
    reset: () => {
      maybeSingleResponses = [];
      selectResponses = [];
      insertPayloads.length = 0;
      updatePayloads.length = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { finalizeDay, ensureDayStateUpToDate } from "@/lib/dayState";

const baseDayState = {
  user_id: "u",
  day_index: 2,
  energy: 70,
  stress: 20,
  cashOnHand: 0,
  knowledge: 0,
  socialLeverage: 0,
  physicalResilience: 50,
  allocation_hash: null,
  pre_allocation_energy: null,
  pre_allocation_stress: null,
  resolved_at: null,
  end_energy: null,
  end_stress: null,
  next_energy: null,
  next_stress: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("finalizeDay", () => {
  it("writes resolved values once", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: baseDayState, error: null },
      { data: { allocation: { study: 40, work: 20, social: 10, health: 20, fun: 10 } }, error: null },
      { data: { user_id: "u", day_index: 2, posture: "steady", created_at: new Date().toISOString() }, error: null },
      { data: { user_id: "u", available_points: 0, cap: 10, last_awarded_day_index: 2 }, error: null },
    ]);
    mockState.setSelectResponses([{ data: [{ key: "unfinished_assignment", severity: 1 }], error: null }]);

    await finalizeDay("u", 2);

    const updates = mockState.getUpdatePayloads();
    expect(updates.length).toBe(1);
    expect(updates[0].table).toBe("player_day_state");
    expect(updates[0].payload).toMatchObject({
      end_energy: 70,
      end_stress: 20,
      next_energy: 86,
      next_stress: 18,
    });
  });

  it("is idempotent when already resolved", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: { ...baseDayState, resolved_at: new Date().toISOString() }, error: null },
    ]);

    await finalizeDay("u", 2);

    expect(mockState.getUpdatePayloads().length).toBe(0);
  });

  it("uses next baseline when creating tomorrow", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: null, error: null },
      {
        data: {
          ...baseDayState,
          day_index: 1,
          next_energy: 88,
          next_stress: 9,
        },
        error: null,
      },
      {
        data: {
          ...baseDayState,
          energy: 88,
          stress: 9,
        },
        error: null,
      },
    ]);

    await ensureDayStateUpToDate("u", 2);

    const inserts = mockState.getInsertPayloads();
    expect(inserts.length).toBe(1);
    expect(inserts[0].payload).toMatchObject({
      energy: 88,
      stress: 9,
    });
  });

  it("does not award skill points before day 2", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: { ...baseDayState, day_index: 1 }, error: null },
      { data: { allocation: { study: 20, work: 20, social: 20, health: 20, fun: 20 } }, error: null },
    ]);
    mockState.setSelectResponses([{ data: [], error: null }]);

    await finalizeDay("u", 1);

    const updates = mockState.getUpdatePayloads();
    expect(updates.length).toBe(1);
    expect(updates[0].table).toBe("player_day_state");
  });

  it("awards skill points after day 2 when conditions met", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: { ...baseDayState, energy: 60, stress: 60 }, error: null },
      { data: { allocation: { study: 20, work: 20, social: 20, health: 20, fun: 20 } }, error: null },
      { data: { user_id: "u", day_index: 2, posture: "push", created_at: new Date().toISOString() }, error: null },
      { data: { user_id: "u", available_points: 1, cap: 10, last_awarded_day_index: 1 }, error: null },
    ]);
    mockState.setSelectResponses([{ data: [], error: null }]);

    await finalizeDay("u", 2);

    const updates = mockState.getUpdatePayloads();
    const skillUpdate = updates.find((item) => item.table === "skill_bank");
    expect(skillUpdate?.payload).toMatchObject({
      available_points: 3,
      last_awarded_day_index: 2,
    });
  });

  it("does not award points when stress is high and posture is not driven", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: { ...baseDayState, energy: 60, stress: 80 }, error: null },
      { data: { allocation: { study: 20, work: 20, social: 20, health: 20, fun: 20 } }, error: null },
      { data: { user_id: "u", day_index: 2, posture: "steady", created_at: new Date().toISOString() }, error: null },
      { data: { user_id: "u", available_points: 5, cap: 10, last_awarded_day_index: 1 }, error: null },
    ]);
    mockState.setSelectResponses([{ data: [], error: null }]);

    await finalizeDay("u", 2);

    const updates = mockState.getUpdatePayloads();
    const skillUpdate = updates.find((item) => item.table === "skill_bank");
    expect(skillUpdate?.payload).toMatchObject({
      available_points: 5,
      last_awarded_day_index: 2,
    });
  });
});
