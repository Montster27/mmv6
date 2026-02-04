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
vi.mock("@/lib/worldState", () => ({
  computeWeekWindow: vi.fn(() => ({ weekStart: 0, weekEnd: 6 })),
  getOrComputeWorldWeeklyInfluence: vi.fn(() => Promise.resolve({})),
}));

import {
  getOrCreateWeeklyDirective,
  fetchActiveDirectiveForCohort,
  computeWeekStart,
  selectDirectiveTemplate,
  selectFactionWithBias,
} from "@/lib/directives";
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
          week_start_day_index: 7,
          week_end_day_index: 13,
          title: "Template",
          description: "Template",
          target_type: "initiative",
          target_key: "campus_signal_watch",
          status: "active",
          created_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const dayIndex = 8;
    const weekStart = computeWeekStart(dayIndex);
    const factionKey = FACTION_KEYS[weekStart % FACTION_KEYS.length];
    const template = selectDirectiveTemplate("c1", weekStart, factionKey);

    const directive = await getOrCreateWeeklyDirective("c1", dayIndex);
    expect(directive.week_start_day_index).toBe(weekStart);

    const inserts = mockState.getInsertPayloads();
    expect(inserts.length).toBe(1);
    expect(inserts[0].table).toBe("faction_directives");
    expect(inserts[0].payload.faction_key).toBe(factionKey);
    expect(inserts[0].payload.title).toBe(template.title);
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

  it("selects target key from unlocked initiatives when available", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: null, error: null },
      {
        data: {
          id: "d1",
          cohort_id: "c1",
          faction_key: "neo_assyrian",
          week_start_day_index: 7,
          week_end_day_index: 13,
          title: "Template",
          description: "Template",
          target_type: "initiative",
          target_key: "market_whisper",
          status: "active",
          created_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const directive = await getOrCreateWeeklyDirective("c1", 8, [
      "quiet_leverage",
      "market_whisper",
    ]);
    expect(directive.target_key).toBe("market_whisper");
  });

  it("biases directive faction toward world leader deterministically", () => {
    const worldInfluence = { bormann_network: 10, neo_assyrian: 2 };
    const weekStart = 0;

    let biasedCohort: string | null = null;
    let rotationCohort: string | null = null;

    for (let i = 0; i < 50; i += 1) {
      const cohortId = `cohort-${i}`;
      const faction = selectFactionWithBias(cohortId, weekStart, worldInfluence);
      if (faction === "bormann_network" && !biasedCohort) biasedCohort = cohortId;
      if (faction !== "bormann_network" && !rotationCohort) rotationCohort = cohortId;
      if (biasedCohort && rotationCohort) break;
    }

    expect(biasedCohort).not.toBeNull();
    expect(rotationCohort).not.toBeNull();
  });
});
