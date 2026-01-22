import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let maybeSingleQueue: Array<{ data: any; error: any }> = [];
  const insertPayloads: Array<{ table: string; payload: any }> = [];

  const builder: any = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleQueue.shift() ?? { data: null, error: null }),
    insert: vi.fn((payload: any) => {
      insertPayloads.push({ table: builder.table, payload });
      return builder;
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
    setMaybeSingleResponses: (responses: Array<{ data: any; error: any }>) => {
      maybeSingleQueue = [...responses];
    },
    getInsertPayloads: () => insertPayloads,
    reset: () => {
      maybeSingleQueue = [];
      insertPayloads.length = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { getOrCreateWeeklyDirective, fetchActiveDirectiveForCohort } from "@/lib/directives";
import { FACTION_KEYS } from "@/lib/factions";

describe("directives", () => {
  it("creates one directive per cohort per week", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: null, error: null },
      {
        data: {
          id: "d1",
          cohort_id: "c1",
          faction_key: FACTION_KEYS[1],
          week_start_day_index: 1,
          week_end_day_index: 7,
          title: "Archive",
          description: "Collect",
          target_type: "initiative",
          target_key: "campus_signal_watch",
          status: "active",
          created_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const directive = await getOrCreateWeeklyDirective("c1", 1, 7);
    expect(directive.week_start_day_index).toBe(1);

    const inserts = mockState.getInsertPayloads();
    expect(inserts.length).toBe(1);
    expect(inserts[0].table).toBe("faction_directives");
    expect(inserts[0].payload.faction_key).toBe(FACTION_KEYS[1]);
  });

  it("fetches active directive for cohort", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      {
        data: {
          id: "d1",
          cohort_id: "c1",
          faction_key: FACTION_KEYS[0],
          week_start_day_index: 1,
          week_end_day_index: 7,
          title: "Signal",
          description: "Keep watch",
          target_type: "initiative",
          target_key: "campus_signal_watch",
          status: "active",
          created_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const directive = await fetchActiveDirectiveForCohort("c1", 2);
    expect(directive?.cohort_id).toBe("c1");
  });
});
