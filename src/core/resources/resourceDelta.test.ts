import { describe, expect, it } from "vitest";

import {
  applyResourceDeltaToSnapshot,
  computeMorale,
} from "@/core/resources/resourceDelta";

describe("resourceDelta", () => {
  it("clamps energy and stress and updates morale", () => {
    const snapshot = {
      energy: 90,
      stress: 5,
      knowledge: 0,
      cashOnHand: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      morale: computeMorale(90, 5),
    };

    const { next } = applyResourceDeltaToSnapshot(snapshot, {
      resources: { energy: 20, stress: -10 },
    });

    expect(next.energy).toBe(100);
    expect(next.stress).toBe(0);
    expect(next.morale).toBe(computeMorale(100, 0));
  });

  it("clamps physical resilience but not knowledge", () => {
    const snapshot = {
      energy: 70,
      stress: 20,
      knowledge: 0,
      cashOnHand: 0,
      socialLeverage: 0,
      physicalResilience: 98,
      morale: computeMorale(70, 20),
    };

    const { next } = applyResourceDeltaToSnapshot(snapshot, {
      resources: { physicalResilience: 10, knowledge: 3 },
    });

    expect(next.physicalResilience).toBe(100);
    expect(next.knowledge).toBe(3);
  });

  it("ignores unknown resource keys", () => {
    const snapshot = {
      energy: 70,
      stress: 20,
      knowledge: 0,
      cashOnHand: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      morale: computeMorale(70, 20),
    };

    const { next } = applyResourceDeltaToSnapshot(snapshot, {
      resources: { unknownKey: 10 } as Record<string, number>,
    });

    expect(next).toEqual(snapshot);
  });
});
