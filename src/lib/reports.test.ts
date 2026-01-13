import { describe, expect, it } from "vitest";

import { validateReportPayload } from "@/lib/reports";

describe("validateReportPayload", () => {
  it("accepts a valid payload", () => {
    const res = validateReportPayload({
      target_type: "clue",
      target_id: "id",
      reason: "spam",
      details: "ok",
    });
    expect(res).toBeNull();
  });

  it("rejects invalid reason", () => {
    const res = validateReportPayload({
      target_type: "clue",
      target_id: "id",
      reason: "bad",
    });
    expect(res).toBe("Invalid reason.");
  });
});
