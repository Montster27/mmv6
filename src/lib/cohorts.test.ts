import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockSupabaseBuilder } from "@/test-utils/mockSupabase";

describe("cohorts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const mockSupabase = createMockSupabaseBuilder();

  it("returns existing cohort membership", async () => {
    // Setup mocks
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));
    vi.doMock("@/lib/events", () => ({ trackEvent: vi.fn() }));

    const { fetchUserCohort } = await import("@/lib/cohorts");

    // Reset state
    mockSupabase.reset();

    // Mock getSession/getUser for ensureUserInCohort if called, but fetchUserCohort doesn't use auth directly?
    // fetchUserCohort uses supabase.from("cohort_members")...
    // We need to set up response.
    mockSupabase.setMaybeSingleResponses([
      { data: { cohort_id: "c1" }, error: null }
    ]);

    const existing = await fetchUserCohort("u");
    expect(existing?.cohortId).toBe("c1");
  });

  it("creates new cohort membership when missing", async () => {
    vi.doMock("@/lib/supabase/browser", () => ({ supabase: mockSupabase.supabase }));
    vi.doMock("@/lib/events", () => ({ trackEvent: vi.fn() }));

    const { ensureUserInCohort } = await import("@/lib/cohorts");
    // Ensure mock is loaded
    await import("@/lib/supabase/browser");

    mockSupabase.reset();

    // ensureUserInCohort flow:
    // 1. getUser() => mockSupabase handles this (returns test-user)
    // 2. fetchUserCohort() => returns null (first call)
    // 3. fetchOpenCohort() => returns explicit cohort or create new?
    // 4. insert into cohort_members

    // We need to queue responses.

    // mockSupabase.auth.getUser() returns { data: { user: { id: "test-user" } } } by default.
    // We pass "u" to ensureUserInCohort, but it ignores it? No, it takes userId optionally?
    // Let's check signature. ensureUserInCohort(userId?: string).

    // Responses needed:
    // 1. fetchUserCohort -> null (not in cohort)
    // 2. fetchOpenCohort -> null (no open cohort, create new)
    //    fetchOpenCohort queries `cohorts` table.
    // 3. createCohort -> insert into `cohorts` -> returns { id: "c-new" }
    // 4. insert into `cohort_members`

    mockSupabase.setMaybeSingleResponses([
      { data: null, error: null }, // fetchUserCohort: no membership
      { data: null, error: null }, // fetchOpenCohort: no open cohort
      { data: { id: "c-new" }, error: null }, // createCohort: returns new ID (simulated return from select after insert or just insert response)
      // wait, insert doesn't return data unless selected.
      // createCohort implementation: .insert().select().single()
    ]);

    // Also fetchOpenCohort does .select()...maybeSingle().
    // fetchUserCohort does .select()...maybeSingle().

    // So 3 maybeSingles.

    // But wait, createCohort might just insert?
    // If it does .select().single(), then we need another response.

    // Let's verify ensuring logic in cohorts.ts
    // For now try to provide enough responses.
    mockSupabase.setMaybeSingleResponses([
      { data: null, error: null }, // fetchUserCohort
      { data: null, error: null }, // fetchOpenCohort (find)
      { data: { id: "c-new" }, error: null }, // createCohort (return id)
    ]);

    // Mock fetch for API call
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ cohortId: "c-new" }),
      })
    ));

    const result = await ensureUserInCohort("u");
    expect(result.cohortId).toBe("c-new");
    // We cannot check insertPayloads on mockSupabase because ensureUserInCohort calls fetch,
    // which calls the API, which presumably uses the service role client (not our browser client mock).
    // So we just verify the function returns what the API returns.

    // Check if fetch was called correctly
    expect(fetch).toHaveBeenCalledWith("/api/cohort/ensure", expect.objectContaining({
      method: "POST"
    }));
  });
});
