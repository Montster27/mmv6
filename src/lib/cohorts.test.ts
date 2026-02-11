import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let membership: string | null = null;
  let createdCohortId: string | null = null;
  let insertMembers = 0;

  const builder = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => {
      if (builder.table === "cohort_members") {
        return { data: membership ? { cohort_id: membership } : null, error: null };
      }
      if (builder.table === "cohorts") {
        return { data: createdCohortId ? { id: createdCohortId } : null, error: null };
      }
      return { data: null, error: null };
    }),
    insert: vi.fn((payload: any) => {
      if (builder.table === "cohorts") {
        createdCohortId = "c-new";
        return builder;
      }
      if (builder.table === "cohort_members") {
        insertMembers += 1;
        membership = payload.cohort_id;
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    }),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      builder.table = table;
      return builder;
    }),
  };

  return {
    supabase,
    setMembership: (value: string | null) => {
      membership = value;
    },
    getInsertMembers: () => insertMembers,
    reset: () => {
      membership = null;
      createdCohortId = null;
      insertMembers = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));
vi.mock("@/lib/events", () => ({ trackEvent: vi.fn() }));

import { ensureUserInCohort, fetchUserCohort } from "@/lib/cohorts";

describe("cohorts", () => {
  it("returns existing cohort membership", async () => {
    mockState.reset();
    mockState.setMembership("c1");
    const existing = await fetchUserCohort("u");
    expect(existing?.cohortId).toBe("c1");
  });

  it("creates new cohort membership when missing", async () => {
    mockState.reset();
    const result = await ensureUserInCohort("u");
    expect(result.cohortId).toBe("c-new");
    expect(mockState.getInsertMembers()).toBe(1);
  });
});
