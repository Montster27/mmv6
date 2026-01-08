import { describe, expect, it } from "vitest";

import { buildWorldDrift } from "@/core/season/worldDrift";

describe("buildWorldDrift", () => {
  it("adds cooperative and fragmented tags for high boosts and low completion", () => {
    const recap = buildWorldDrift({
      completionRate: 30,
      boostsPerActive: 1.2,
      anomaliesPerActive: 0.2,
      avgSessionDurationMs: 4 * 60 * 1000,
    });
    expect(recap.driftTags).toContain("Community is leaning cooperative");
    expect(recap.driftTags).toContain("Timeline feels unstable and fragmented");
  });
});
