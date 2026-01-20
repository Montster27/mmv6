import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  let maybeSingleQueue: Array<{ data: any; error: any }> = [];
  let updatePayloads: any[] = [];
  let insertPayloads: any[] = [];

  const builder = {
    table: "",
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleQueue.shift() ?? { data: null, error: null }),
    insert: vi.fn((payload: any) => {
      insertPayloads.push(payload);
      return builder;
    }),
    update: vi.fn((payload: any) => {
      updatePayloads.push(payload);
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
    builder,
    setMaybeSingleResponses: (responses: Array<{ data: any; error: any }>) => {
      maybeSingleQueue = [...responses];
    },
    getUpdatePayloads: () => updatePayloads,
    getInsertPayloads: () => insertPayloads,
    reset: () => {
      maybeSingleQueue = [];
      updatePayloads = [];
      insertPayloads = [];
    },
  };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));
vi.mock("@/lib/content/arcs", () => ({
  fetchArcSteps: vi.fn(),
}));

import { fetchArcSteps } from "@/lib/content/arcs";
import { progressArcWithChoice, startArc } from "@/lib/arcs";

describe("arcs", () => {
  it("starts an arc when missing", async () => {
    mockState.reset();
    mockState.setMaybeSingleResponses([
      { data: null, error: null },
      {
        data: {
          id: "inst-1",
          user_id: "u",
          arc_key: "anomaly_001",
          status: "active",
          started_day_index: 2,
          current_step: 0,
          updated_at: new Date().toISOString(),
          meta: null,
        },
        error: null,
      },
    ]);

    const result = await startArc("u", "anomaly_001", 2);
    expect(result.arc_key).toBe("anomaly_001");
    expect(mockState.getInsertPayloads().length).toBe(1);
  });

  it("advances an arc and merges choice flags", async () => {
    mockState.reset();
    vi.mocked(fetchArcSteps).mockResolvedValue([
      {
        arc_key: "anomaly_001",
        step_index: 0,
        title: "Step 0",
        body: "Body",
        choices: [
          {
            key: "log_it",
            label: "Log it",
            flags: { arc_anomaly_001_logged: true },
          },
        ],
        created_at: new Date().toISOString(),
      },
      {
        arc_key: "anomaly_001",
        step_index: 1,
        title: "Step 1",
        body: "Body",
        choices: [],
        created_at: new Date().toISOString(),
      },
    ]);
    mockState.setMaybeSingleResponses([
      {
        data: {
          id: "inst-1",
          user_id: "u",
          arc_key: "anomaly_001",
          status: "active",
          started_day_index: 2,
          current_step: 0,
          updated_at: new Date().toISOString(),
          meta: { flags: { existing: true } },
        },
        error: null,
      },
      {
        data: {
          id: "inst-1",
          user_id: "u",
          arc_key: "anomaly_001",
          status: "active",
          started_day_index: 2,
          current_step: 0,
          updated_at: new Date().toISOString(),
          meta: { flags: { existing: true } },
        },
        error: null,
      },
      { data: { id: "inst-1" }, error: null },
      { data: { id: "inst-1" }, error: null },
    ]);

    await progressArcWithChoice("u", "anomaly_001", "log_it");

    const updatePayloads = mockState.getUpdatePayloads();
    expect(updatePayloads.length).toBe(2);
    expect(updatePayloads[0]).toMatchObject({
      meta: { flags: { existing: true, arc_anomaly_001_logged: true } },
    });
    expect(updatePayloads[1]).toMatchObject({
      current_step: 1,
    });
  });
});
