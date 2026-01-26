import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const updatePayloads: Array<{ table: string; payload: any }> = [];

  const builder: any = {
    table: "",
    upsert: vi.fn(async () => ({ error: null })),
    update: vi.fn((payload: any) => {
      updatePayloads.push({ table: builder.table, payload });
      return builder;
    }),
    eq: vi.fn(() => builder),
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
    getUpdatePayloads: () => updatePayloads,
    reset: () => {
      updatePayloads.length = 0;
      builder.upsert.mockClear();
      builder.update.mockClear();
      builder.eq.mockClear();
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));
vi.mock("@/lib/dayState", () => ({ ensureDayStateUpToDate: vi.fn() }));

import { saveTimeAllocation } from "@/lib/play";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { hashAllocation } from "@/core/sim/allocationEffects";

const allocation = { study: 40, work: 20, social: 10, health: 20, fun: 10 };

describe("saveTimeAllocation", () => {
  it("applies allocation effects on first submit", async () => {
    mockState.reset();
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 70,
      stress: 20,
      money: 0,
      study_progress: 0,
      social_capital: 0,
      health: 50,
      allocation_hash: null,
      pre_allocation_energy: null,
      pre_allocation_stress: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await saveTimeAllocation("u", 2, allocation, "steady");

    const updates = mockState.getUpdatePayloads();
    expect(updates.length).toBe(1);
    expect(updates[0].table).toBe("player_day_state");
    expect(updates[0].payload).toMatchObject({
      energy: 60,
      stress: 23,
      pre_allocation_energy: 70,
      pre_allocation_stress: 20,
      allocation_hash: hashAllocation(allocation),
    });
  });

  it("is idempotent for the same allocation", async () => {
    mockState.reset();
    const sameHash = hashAllocation(allocation);
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 62,
      stress: 20,
      money: 0,
      study_progress: 0,
      social_capital: 0,
      health: 50,
      allocation_hash: sameHash,
      pre_allocation_energy: 70,
      pre_allocation_stress: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await saveTimeAllocation("u", 2, allocation, "steady");

    expect(mockState.getUpdatePayloads().length).toBe(0);
  });

  it("recomputes from pre-allocation baseline when allocation changes", async () => {
    mockState.reset();
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 62,
      stress: 20,
      money: 0,
      study_progress: 0,
      social_capital: 0,
      health: 50,
      allocation_hash: "old",
      pre_allocation_energy: 60,
      pre_allocation_stress: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const nextAllocation = {
      study: 30,
      work: 30,
      social: 10,
      health: 20,
      fun: 10,
    };

    await saveTimeAllocation("u", 2, nextAllocation, "steady");

    const updates = mockState.getUpdatePayloads();
    expect(updates.length).toBe(1);
    expect(updates[0].payload).toMatchObject({
      pre_allocation_energy: 60,
      pre_allocation_stress: 10,
      allocation_hash: hashAllocation(nextAllocation),
    });
    expect(updates[0].payload.energy).toBe(50);
    expect(updates[0].payload.stress).toBe(13);
  });
});
