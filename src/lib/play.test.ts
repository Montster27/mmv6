import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabaseBuilder } from "../test-utils/mockSupabase";

describe("createStoryletRun", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("is idempotent on double submit", async () => {
    const mockSupabase = createMockSupabaseBuilder();

    // Setup mock before importing module under test
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));

    // Dynamic import to ensure mock is used
    const { createStoryletRun } = await import("@/lib/play");

    // First call: no existing run
    // Second call: existing run found
    mockSupabase.setMaybeSingleResponses([
      { data: null, error: null },
      { data: { id: "run-1" }, error: null },
    ]);

    const first = await createStoryletRun("u", "s1", 2, "c1");
    const second = await createStoryletRun("u", "s1", 2, "c1");

    expect(first).toBeNull();
    expect(second).toBe("run-1");
    expect(mockSupabase.getInsertPayloads().length).toBe(1);
    expect(mockSupabase.getInsertPayloads()[0]).toEqual({
      table: "storylet_runs",
      payload: {
        user_id: "u",
        storylet_id: "s1",
        day_index: 2,
        choice_id: "c1",
      },
    });
  });
});
