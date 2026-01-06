import assert from "node:assert/strict";

import {
  coerceStoryletRow,
  fallbackStorylet,
  validateStorylet,
} from "./storyletValidation";

const valid = {
  id: "s1",
  slug: "slug",
  title: "Title",
  body: "Body",
  choices: [
    { id: "a", label: "A" },
    { id: "b", label: "B", outcome: { stress: -1 } },
  ],
  is_active: true,
};

// Basic smoke checks. Run with: node src/core/validation/storyletValidation.test.ts
(() => {
  const res = validateStorylet(valid);
  assert.equal(res.ok, true);
})();

(() => {
  const invalidChoices = { ...valid, choices: "not-array" };
  const res = validateStorylet(invalidChoices);
  assert.equal(res.ok, false);
})();

(() => {
  const coerced = coerceStoryletRow({ ...valid, choices: null });
  assert(Array.isArray(coerced.choices));
  assert.equal(coerced.choices.length, 0);
})();

(() => {
  const fb = fallbackStorylet();
  assert.ok(fb.title.includes("Corrupted"));
  assert.equal(fb.choices[0]?.id, "continue");
})();

console.log("storyletValidation tests passed");
