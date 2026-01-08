import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const builder = {
    insert: vi.fn(async () => ({ error: { message: "duplicate key" } })),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: { id: "existing" }, error: null })),
  };

  const supabase = {
    from: vi.fn(() => builder),
  };

  return { supabase };
});

vi.mock("@/lib/supabaseClient", () => ({ supabase: mockState.supabase }));
vi.mock("@/lib/events", () => ({ trackEvent: vi.fn() }));

import { linkAnomaly } from "@/lib/hypotheses";

describe("linkAnomaly", () => {
  it("returns false when the link already exists", async () => {
    await expect(linkAnomaly("h1", "a_clock_skips")).resolves.toBe(false);
  });
});
