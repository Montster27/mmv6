import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const builder: any = {
    table: "",
    update: vi.fn(() => builder),
    eq: vi.fn(() => ({ error: null })),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      builder.table = table;
      return builder;
    }),
  };

  return { supabase, builder };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { applyOutcomeForChoice } from "@/lib/play";
import type { Storylet } from "@/types/storylets";

describe("applyOutcomeForChoice checks", () => {
  it("selects the success branch when the check passes", async () => {
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
