import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let selectResponses: Array<{ data: any; error: any }> = [];
  let maybeSingleResponses: Array<{ data: any; error: any }> = [];
  const insertPayloads: Array<{ table: string; payload: any }> = [];
  const updatePayloads: Array<{ table: string; payload: any }> = [];

  const builder: any = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleResponses.shift() ?? { data: null, error: null }),
    insert: vi.fn(async (payload: any) => {
      insertPayloads.push({ table: builder.table, payload });
      return { error: null };
    }),
    update: vi.fn((payload: any) => {
      updatePayloads.push({ table: builder.table, payload });
      return builder;
    }),
    order: vi.fn(() => builder),
    then: (resolve: any) =>
      Promise.resolve(selectResponses.shift() ?? { data: [], error: null }).then(resolve),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      builder.table = table;
      return builder;
    }),
  };

  return {
    supabase,
    builder,
    setSelectResponses: (responses: Array<{ data: any; error: any }>) => {
      selectResponses = [...responses];
    },
    setMaybeSingleResponses: (responses: Array<{ data: any; error: any }>) => {
      maybeSingleResponses = [...responses];
    },
    getInsertPayloads: () => insertPayloads,
    getUpdatePayloads: () => updatePayloads,
    reset: () => {
      selectResponses = [];
      maybeSingleResponses = [];
      insertPayloads.length = 0;
      updatePayloads.length = 0;
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { applyAlignmentDelta, ensureUserAlignmentRows } from "@/lib/alignment";
import { FACTION_KEYS } from "@/lib/factions";

describe("alignment", () => {
  it("creates missing alignment rows", async () => {
    mockState.reset();
    mockState.setSelectResponses([
      {
        data: [{ faction_key: FACTION_KEYS[0] }, { faction_key: FACTION_KEYS[1] }],
        error: null,
      },
    ]);

    await ensureUserAlignmentRows("u");

    const inserts = mockState.getInsertPayloads();
    expect(inserts.length).toBe(1);
    expect(inserts[0].table).toBe("user_alignment");
    expect(inserts[0].payload).toHaveLength(2);
  });

  it("updates alignment and records an event", async () => {
    mockState.reset();
    mockState.setSelectResponses([
      {
        data: FACTION_KEYS.map((key) => ({ faction_key: key })),
        error: null,
      },
    ]);
    mockState.setMaybeSingleResponses([
      { data: { score: 1 }, error: null },
      { data: { score: 3 }, error: null },
    ]);

    await applyAlignmentDelta({
      userId: "u",
      dayIndex: 2,
      factionKey: "templar_remnant",
      delta: 2,
      source: "arc_choice",
      sourceRef: "anomaly_001:0:go",
    });

    const updates = mockState.getUpdatePayloads();
    expect(updates.length).toBe(1);
    expect(updates[0].table).toBe("user_alignment");
    expect(updates[0].payload).toMatchObject({ score: 3 });

    const inserts = mockState.getInsertPayloads();
    expect(inserts.some((entry) => entry.table === "alignment_events")).toBe(true);
  });
});
