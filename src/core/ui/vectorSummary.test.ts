import { describe, expect, it } from "vitest";

import { summarizeVectors } from "./vectorSummary";

describe("summarizeVectors", () => {
  it("returns a default summary when empty", () => {
    const res = summarizeVectors({});
    expect(res).toBe("Your direction is still forming.");
  });

  it("summarizes the dominant vector", () => {
    const res = summarizeVectors({ focus: 5, curiosity: 7 });
    expect(res).toBe("You lean toward curiosity.");
  });

  it("summarizes change when deltas exist", () => {
    const res = summarizeVectors(
      { focus: 5, curiosity: 7 },
      { vectors: { focus: 3, curiosity: 1 } }
    );
    expect(res).toBe("You’re becoming more focus."); // delta focus=3, curiosity=1. Max delta is focus.
  });
});
