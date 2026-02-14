import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabaseBuilder } from "@/test-utils/mockSupabase";
import type { Storylet } from "@/types/storylets";

describe("applyOutcomeForChoice checks", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const storylet: Storylet = {
    id: "story",
    slug: "story",
    title: "Story",
    body: "Body",
    is_active: true,
    choices: [
      {
        id: "choice",
        label: "Try",
        check: {
          id: "check",
          baseChance: 0.4,
          skillWeights: { focus: 0.01 },
        },
        outcomes: [
          {
            id: "success",
            weight: 1,
            text: "Success",
            deltas: { stress: -1 },
          },
          {
            id: "failure",
            weight: 1,
            text: "Failure",
            deltas: { stress: 1 },
          },
        ],
      },
    ],
  };

  it("selects the success branch when the check passes", async () => {
    const mockSupabase = createMockSupabaseBuilder();
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));

    // Mock ensureDayStateUpToDate as it calls fetchDayState which uses select.
    // If not mocked, real fetchDayState runs and fails if mockSupabase doesn't return data.
    vi.doMock("@/lib/dayState", () => ({
      ensureDayStateUpToDate: vi.fn().mockResolvedValue({ energy: 60, stress: 20 })
    }));

    // Import SUT dynamically so mocks apply
    const { applyOutcomeForChoice } = await import("@/lib/play");
    // Ensure mock is loaded
    await import("@/lib/dayState");

    mockSupabase.reset();

    const result = await applyOutcomeForChoice(
      { id: "d", user_id: "u", day_index: 3, energy: 50, stress: 40, vectors: {} },
      "choice",
      storylet,
      "u",
      3,
      {
        dayState: { energy: 60, stress: 20 },
        skills: { focus: 0, memory: 0, networking: 0, grit: 0 },
        posture: "steady",
      }
    );

    expect(result.resolvedOutcomeId).toBe("success");
    expect(result.lastCheck?.success).toBe(true);
  });
});
