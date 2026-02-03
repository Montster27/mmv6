import { describe, expect, it } from "vitest";
import { allocationToVectorDeltas } from "@/core/vectors/allocationToVectorDeltas";

describe("allocationToVectorDeltas", () => {
  it("nudges based on dominant allocations", () => {
    const deltas = allocationToVectorDeltas({
      study: 40,
      work: 10,
      social: 30,
      health: 20,
      fun: 20,
    });

    expect(deltas).toMatchObject({
      focus: 1,
      social: 1,
      stability: 1,
    });
    expect(deltas.ambition).toBeUndefined();
  });
});
