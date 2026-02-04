import { describe, expect, it } from "vitest";

import { computeUnlockedContent } from "@/lib/unlocks";
import type { ContentArc, ContentInitiative } from "@/types/content";

const arc = (key: string): ContentArc => ({
  key,
  title: key,
  description: "",
  tags: [],
  is_active: true,
  created_at: new Date().toISOString(),
});

const initiative = (key: string): ContentInitiative => ({
  key,
  title: key,
  description: "",
  goal: 0,
  duration_days: 7,
  tags: [],
  is_active: true,
  created_at: new Date().toISOString(),
});

describe("unlocks", () => {
  it("only returns keys present in content catalogs", () => {
    const alignment = { neo_assyrian: 12, dynastic_consortium: 0 };
    const contentArcs = [arc("anomaly_002")];
    const contentInitiatives = [initiative("quiet_leverage")];

    const result = computeUnlockedContent(alignment, contentArcs, contentInitiatives);

    expect(result.unlockedArcKeys).toEqual(["anomaly_002"]);
    expect(result.unlockedInitiativeKeys).toEqual(["quiet_leverage"]);
  });
});
