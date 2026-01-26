import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const builder = {
    upsert: vi.fn(async () => ({ error: null })),
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
      builder.upsert.mockClear();
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
