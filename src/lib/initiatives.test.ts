import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const builder = {
    insert: vi.fn(async () => ({ error: { code: "23505" } })),
  };

  const supabase = {
    from: vi.fn(() => builder),
  };

  return { supabase, builder };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));
vi.mock("@/lib/directives", () => ({
  fetchActiveDirectiveForCohort: vi.fn(),
}));
vi.mock("@/lib/alignment", () => ({
  applyAlignmentDelta: vi.fn(),
}));

import { contributeToInitiative } from "@/lib/initiatives";

describe("initiatives", () => {
  it("enforces one contribution per day", async () => {
    await expect(
      contributeToInitiative("init-1", "u", 2, 1)
    ).rejects.toThrow("Contribution already recorded today.");
  });
});
