import assert from "node:assert/strict";
import { summarizeVectors } from "./vectorSummary";

// Run with: node src/core/ui/vectorSummary.test.ts
(() => {
  const res = summarizeVectors({});
  assert.equal(res, "Your direction is still forming.");
})();

(() => {
  const res = summarizeVectors({ focus: 5, calm: 7 });
  assert.equal(res, "You lean toward calm.");
})();

(() => {
  const res = summarizeVectors(
    { focus: 5, calm: 7 },
    { vectors: { focus: 3, calm: 1 } }
  );
  assert.equal(res, "You’re becoming more focus.");
})();

console.log("vectorSummary tests passed");
