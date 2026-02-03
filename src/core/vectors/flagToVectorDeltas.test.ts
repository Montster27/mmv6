import { describe, expect, it } from "vitest";
import { flagToVectorDeltas } from "@/core/vectors/flagToVectorDeltas";

describe("flagToVectorDeltas", () => {
  it("maps flags to vector deltas", () => {
    const deltas = flagToVectorDeltas({
      research: true,
      cautious: true,
      social: true,
      avoid: true,
    });

    expect(deltas).toMatchObject({
      curiosity: 2,
      stability: 2,
      social: 2,
      reflection: 1,
      agency: -1,
    });
  });
});
