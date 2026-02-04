import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let insertCalls = 0;
  const builder = {
    insert: vi.fn(async () => {
      insertCalls += 1;
      if (insertCalls === 1) {
        return { error: { message: "duplicate key" } };
      }
      return { error: null };
    }),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: { id: "existing" }, error: null })),
  };

  const supabase = {
    from: vi.fn(() => builder),
  };

  return {
    supabase,
    reset: () => {
      insertCalls = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { awardAnomalies } from "@/lib/anomalies";

describe("awardAnomalies", () => {
  it("does not throw on duplicate anomaly", async () => {
    mockState.reset();
    await expect(
      awardAnomalies({
        userId: "u",
        anomalyIds: ["a_clock_skips"],
        dayIndex: 2,
        source: "storylet-1",
      })
    ).resolves.toBeUndefined();
  });
});
