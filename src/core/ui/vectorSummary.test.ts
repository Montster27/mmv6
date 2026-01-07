import { describe, expect, it } from "vitest";

import { summarizeVectors } from "./vectorSummary";

describe("summarizeVectors", () => {
  it("returns a default summary when empty", () => {
    const res = summarizeVectors({});
    expect(res).toBe("Your direction is still forming.");
  });

  it("summarizes the dominant vector", () => {
    const res = summarizeVectors({ focus: 5, calm: 7 });
    expect(res).toBe("You lean toward calm.");
  });

  it("summarizes change when deltas exist", () => {
    const res = summarizeVectors(
      { focus: 5, calm: 7 },
      { vectors: { focus: 3, calm: 1 } }
    );
    expect(res).toBe("You’re becoming more focus.");
  });
});
