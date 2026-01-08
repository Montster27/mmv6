import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let existingId: string | null = null;
  let insertCalls = 0;

  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({
      data: existingId ? { id: existingId } : null,
      error: null,
    })),
    insert: vi.fn(async () => {
      insertCalls += 1;
      if (!existingId) {
        existingId = "run-1";
      }
      return { error: null };
    }),
  };

  const supabase = {
    from: vi.fn(() => builder),
  };

  return {
    supabase,
    reset: () => {
      existingId = null;
      insertCalls = 0;
    },
    getInsertCalls: () => insertCalls,
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { createStoryletRun } from "@/lib/play";

describe("createStoryletRun", () => {
  it("is idempotent on double submit", async () => {
    mockState.reset();

    const first = await createStoryletRun("u", "s1", 2, "c1");
    const second = await createStoryletRun("u", "s1", 2, "c1");

    expect(first).toBeNull();
    expect(second).toBe("run-1");
    expect(mockState.getInsertCalls()).toBe(1);
  });
});
