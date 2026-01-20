import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const builder = {
    table: "",
    rows: [] as any[],
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(async () => {
      if (builder.table === "content_arc_steps") {
        return {
          data: builder.rows.sort((a, b) => a.step_index - b.step_index),
          error: null,
        };
      }
      return { data: null, error: null };
    }),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => {
      if (builder.table === "content_arcs") {
        return {
          data: {
            key: "anomaly_001",
            title: "Arc",
            description: "desc",
            tags: [],
            is_active: true,
            created_at: new Date().toISOString(),
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      builder.table = table;
      if (table === "content_arc_steps") {
        builder.rows = [
          {
            arc_key: "anomaly_001",
            step_index: 1,
            title: "Two",
            body: "b",
            choices: [],
            created_at: new Date().toISOString(),
          },
          {
            arc_key: "anomaly_001",
            step_index: 0,
            title: "One",
            body: "a",
            choices: [],
            created_at: new Date().toISOString(),
          },
        ];
      }
      return builder;
    }),
  };

  return { supabase };
});

vi.mock("@/lib/supabase/browser", () => ({ supabase: mockState.supabase }));

import { fetchArcWithSteps } from "@/lib/content/arcs";

describe("content loaders", () => {
  it("fetches arc with ordered steps", async () => {
    const result = await fetchArcWithSteps("anomaly_001");
    expect(result?.arc.key).toBe("anomaly_001");
    expect(result?.steps[0]?.step_index).toBe(0);
    expect(result?.steps[1]?.step_index).toBe(1);
  });
});
