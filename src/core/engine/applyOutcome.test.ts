import assert from "node:assert/strict";

import { applyOutcomeToDailyState } from "./applyOutcome";
import type { DailyState } from "../../types/daily";

const baseState: DailyState = {
  id: "d1",
  user_id: "u1",
  day_index: 1,
  energy: 50,
  stress: 10,
  vectors: {},
};

// Run with: node src/core/engine/applyOutcome.test.ts
(() => {
  const res = applyOutcomeToDailyState(baseState, {
    text: "You feel focused.",
    deltas: { energy: 10, stress: -5, vectors: { focus: 5 } },
  });
  assert.equal(res.nextDailyState.energy, 60);
  assert.equal(res.nextDailyState.stress, 5);
  assert.equal((res.nextDailyState.vectors as any).focus, 5);
  assert.equal(res.appliedDeltas.energy, 10);
  assert.equal(res.appliedDeltas.stress, -5);
  assert.equal(res.message, "You feel focused.");
})();

(() => {
  const res = applyOutcomeToDailyState(
    { ...baseState, energy: 95, stress: 98, vectors: { calm: 99 } },
    {
      deltas: { energy: 10, stress: 10, vectors: { calm: 10 } },
    }
  );
  assert.equal(res.nextDailyState.energy, 100);
  assert.equal(res.nextDailyState.stress, 100);
  assert.equal((res.nextDailyState.vectors as any).calm, 100);
})();

(() => {
  const res = applyOutcomeToDailyState(baseState);
  assert.equal(res.nextDailyState.energy, baseState.energy);
  assert.equal(Object.keys(res.appliedDeltas).length, 0);
  assert.equal(res.message, "");
})();

console.log("applyOutcome tests passed");
