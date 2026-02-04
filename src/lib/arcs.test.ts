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
vi.mock("@/lib/alignment", () => ({
  applyAlignmentDelta: vi.fn(),
  ARC_CHOICE_ALIGNMENT_DELTAS: {
    log_it: { factionKey: "dynastic_consortium", delta: 2 },
  },
}));
vi.mock("@/lib/play", () => ({
  fetchDailyState: vi.fn(),
  updateDailyState: vi.fn(),
}));
vi.mock("@/lib/dayState", () => ({
  ensureDayStateUpToDate: vi.fn(),
}));

import { fetchArcSteps } from "@/lib/content/arcs";
import { applyAlignmentDelta } from "@/lib/alignment";
import { progressArcWithChoice, startArc } from "@/lib/arcs";
import { fetchDailyState, updateDailyState } from "@/lib/play";
import { ensureDayStateUpToDate } from "@/lib/dayState";

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
            flags: { arc_anomaly_001_logged: true, research: true },
            costs: { cashOnHand: 1 },
            rewards: { socialLeverage: 1 },
            vector_deltas: { curiosity: 2 },
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
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 70,
      stress: 20,
      cashOnHand: 5,
      knowledge: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
    vi.mocked(fetchDailyState).mockResolvedValue({
      id: "d1",
      user_id: "u",
      day_index: 2,
      energy: 70,
      stress: 20,
      vectors: {},
    });

    await progressArcWithChoice("u", "anomaly_001", "log_it", 2);

    const updatePayloads = mockState.getUpdatePayloads();
    expect(updatePayloads.length).toBe(2);
    expect(updatePayloads[0]).toMatchObject({
      meta: { flags: { existing: true, arc_anomaly_001_logged: true } },
    });
    expect(updatePayloads[1]).toMatchObject({
      current_step: 1,
    });
    expect(applyAlignmentDelta).toHaveBeenCalledWith({
      userId: "u",
      dayIndex: 2,
      factionKey: "dynastic_consortium",
      delta: 2,
      source: "arc_choice",
      sourceRef: "anomaly_001:0:log_it",
    });
    expect(updateDailyState).toHaveBeenCalledWith("u", {
      energy: 70,
      stress: 20,
      vectors: { curiosity: 2 },
    });
  });

  it("blocks arc choice when costs are not affordable", async () => {
    mockState.reset();
    vi.mocked(fetchArcSteps).mockResolvedValue([
      {
        arc_key: "anomaly_001",
        step_index: 0,
        title: "Step 0",
        body: "Body",
        choices: [
          {
            key: "ask_casually",
            label: "Ask",
            costs: { cashOnHand: 2 },
          },
        ],
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
          meta: { flags: {} },
        },
        error: null,
      },
    ]);
    vi.mocked(ensureDayStateUpToDate).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      energy: 70,
      stress: 20,
      cashOnHand: 1,
      knowledge: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    await expect(
      progressArcWithChoice("u", "anomaly_001", "ask_casually", 2)
    ).rejects.toThrow("INSUFFICIENT_RESOURCES:cashOnHand");
  });
});
