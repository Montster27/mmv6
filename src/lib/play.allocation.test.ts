import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabaseBuilder } from "@/test-utils/mockSupabase";
import { hashAllocation } from "@/core/sim/allocationEffects";
// We mock these but import them for type usage or just to satisfy the test logic
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { fetchSkillLevels } from "@/lib/dailyInteractions";

describe("saveTimeAllocation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const allocation = { study: 40, work: 20, social: 10, health: 20, fun: 10 };

  it("applies allocation effects on first submit", async () => {
    const mockSupabase = createMockSupabaseBuilder();

    // Mocks
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));
    vi.doMock("@/lib/dayState", () => ({ ensureDayStateUpToDate: vi.fn() }));
    vi.doMock("@/lib/dailyInteractions", () => ({ fetchSkillLevels: vi.fn() }));

    // Import SUT after mocks
    const { saveTimeAllocation } = await import("@/lib/play");
    const { ensureDayStateUpToDate } = await import("@/lib/dayState"); // mocked version
    const { fetchSkillLevels } = await import("@/lib/dailyInteractions"); // mocked version

    mockSupabase.reset();

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

    // We also need to mock fetchDailyState response if called.
    // fetchDailyState is called if vectorDeltas > 0.
    // For this allocation, vectorDeltas might be present.
    // mockSupabase.supabase.from("daily_states").select(...).maybeSingle()
    mockSupabase.setMaybeSingleResponses([
      {
        data: {
          energy: 70,
          stress: 20,
          money: 0,
          study_progress: 0,
          social_capital: 0,
          health: 50,
        },
        error: null,
      },
      { data: { id: "ds1", user_id: "u", day_index: 2, energy: 60, stress: 23, vectors: {} }, error: null },
    ]);

    await saveTimeAllocation("u", 2, allocation, "steady");

    const updates = mockSupabase.getUpdatePayloads();
    // 1 update for player_day_state
    // potentially 1 update for daily_states if vectors applied

    const dayStateUpdate = updates.find(u => u.table === "player_day_state");
    expect(dayStateUpdate).toBeDefined();
    expect(dayStateUpdate!.payload).toMatchObject({
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
    const mockSupabase = createMockSupabaseBuilder();
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));
    vi.doMock("@/lib/dayState", () => ({ ensureDayStateUpToDate: vi.fn() }));
    vi.doMock("@/lib/dailyInteractions", () => ({ fetchSkillLevels: vi.fn() }));

    const { saveTimeAllocation } = await import("@/lib/play");
    const { ensureDayStateUpToDate } = await import("@/lib/dayState"); // mocked version
    const { fetchSkillLevels } = await import("@/lib/dailyInteractions"); // mocked version

    mockSupabase.reset();
    vi.mocked(fetchSkillLevels).mockResolvedValue({ focus: 0, memory: 0, networking: 0, grit: 0 });

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

    expect(mockSupabase.getUpdatePayloads().length).toBe(0);
  });

  it("recomputes from pre-allocation baseline when allocation changes", async () => {
    const mockSupabase = createMockSupabaseBuilder();
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));
    vi.doMock("@/lib/dayState", () => ({ ensureDayStateUpToDate: vi.fn() }));
    vi.doMock("@/lib/dailyInteractions", () => ({ fetchSkillLevels: vi.fn() }));

    const { saveTimeAllocation } = await import("@/lib/play");
    const { ensureDayStateUpToDate } = await import("@/lib/dayState");
    const { fetchSkillLevels } = await import("@/lib/dailyInteractions");

    mockSupabase.reset();
    vi.mocked(fetchSkillLevels).mockResolvedValue({ focus: 0, memory: 0, networking: 0, grit: 0 });

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

    const nextAllocation = { study: 30, work: 30, social: 10, health: 20, fun: 10 };

    // Mock response for fetchDailyState if needed (it might be called)
    mockSupabase.setMaybeSingleResponses([
      {
        data: {
          energy: 62,
          stress: 20,
          money: 0,
          study_progress: 0,
          social_capital: 0,
          health: 50,
        },
        error: null,
      },
      { data: { id: "ds1", user_id: "u", day_index: 2, energy: 60, stress: 23, vectors: {} }, error: null },
    ]);

    await saveTimeAllocation("u", 2, nextAllocation, "steady");

    const updates = mockSupabase.getUpdatePayloads();
    const dayStateUpdate = updates.find(u => u.table === "player_day_state");
    expect(dayStateUpdate).toBeDefined();
    expect(dayStateUpdate!.payload).toMatchObject({
      pre_allocation_energy: 60,
      pre_allocation_stress: 10,
      pre_allocation_money: 5,
      pre_allocation_study_progress: 3,
      pre_allocation_social_capital: 1,
      pre_allocation_health: 40,
      allocation_hash: hashAllocation(nextAllocation),
    });
    expect(dayStateUpdate!.payload.energy).toBe(50);
    expect(dayStateUpdate!.payload.stress).toBe(13);
  });
});
