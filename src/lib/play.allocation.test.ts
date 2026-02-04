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
vi.mock("@/lib/dailyInteractions", () => ({ fetchSkillLevels: vi.fn() }));

import { saveTimeAllocation } from "@/lib/play";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { hashAllocation } from "@/core/sim/allocationEffects";
import { fetchSkillLevels } from "@/lib/dailyInteractions";

const allocation = { study: 40, work: 20, social: 10, health: 20, fun: 10 };

describe("saveTimeAllocation", () => {
  it("applies allocation effects on first submit", async () => {
    mockState.reset();
    vi.mocked(fetchSkillLevels).mockResolvedValue({
      focus: 0,
      memory: 0,
      networking: 0,
      grit: 0,
    });
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 70,
      stress: 20,
      cashOnHand: 0,
      knowledge: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      total_study: 0,
      total_work: 0,
      total_social: 0,
      total_health: 0,
      total_fun: 0,
      allocation_hash: null,
      pre_allocation_energy: null,
      pre_allocation_stress: null,
      pre_allocation_cashOnHand: null,
      pre_allocation_knowledge: null,
      pre_allocation_socialLeverage: null,
      pre_allocation_physicalResilience: null,
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
      money: 2,
      study_progress: 4,
      social_capital: 1,
      health: 51,
      pre_allocation_energy: 70,
      pre_allocation_stress: 20,
      pre_allocation_money: 0,
      pre_allocation_study_progress: 0,
      pre_allocation_social_capital: 0,
      pre_allocation_health: 50,
      allocation_hash: hashAllocation(allocation),
    });
  });

  it("is idempotent for the same allocation", async () => {
    mockState.reset();
    vi.mocked(fetchSkillLevels).mockResolvedValue({
      focus: 0,
      memory: 0,
      networking: 0,
      grit: 0,
    });
    const sameHash = hashAllocation(allocation);
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 62,
      stress: 20,
      cashOnHand: 0,
      knowledge: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      total_study: 0,
      total_work: 0,
      total_social: 0,
      total_health: 0,
      total_fun: 0,
      allocation_hash: sameHash,
      pre_allocation_energy: 70,
      pre_allocation_stress: 20,
      pre_allocation_cashOnHand: 0,
      pre_allocation_knowledge: 0,
      pre_allocation_socialLeverage: 0,
      pre_allocation_physicalResilience: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await saveTimeAllocation("u", 2, allocation, "steady");

    expect(mockState.getUpdatePayloads().length).toBe(0);
  });

  it("recomputes from pre-allocation baseline when allocation changes", async () => {
    mockState.reset();
    vi.mocked(fetchSkillLevels).mockResolvedValue({
      focus: 0,
      memory: 0,
      networking: 0,
      grit: 0,
    });
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 62,
      stress: 20,
      cashOnHand: 0,
      knowledge: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      total_study: 0,
      total_work: 0,
      total_social: 0,
      total_health: 0,
      total_fun: 0,
      allocation_hash: "old",
      pre_allocation_energy: 60,
      pre_allocation_stress: 10,
      pre_allocation_cashOnHand: 5,
      pre_allocation_knowledge: 3,
      pre_allocation_socialLeverage: 1,
      pre_allocation_physicalResilience: 40,
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
      pre_allocation_money: 5,
      pre_allocation_study_progress: 3,
      pre_allocation_social_capital: 1,
      pre_allocation_health: 40,
      allocation_hash: hashAllocation(nextAllocation),
    });
    expect(updates[0].payload.energy).toBe(50);
    expect(updates[0].payload.stress).toBe(13);
  });
});
