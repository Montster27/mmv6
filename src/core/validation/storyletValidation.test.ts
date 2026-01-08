import { describe, expect, it } from "vitest";

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

describe("storyletValidation", () => {
  it("validates a well-formed storylet", () => {
    const res = validateStorylet(valid);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid choices", () => {
    const invalidChoices = { ...valid, choices: "not-array" };
    const res = validateStorylet(invalidChoices);
    expect(res.ok).toBe(false);
  });

  it("coerces missing choices to an empty array", () => {
    const coerced = coerceStoryletRow({ ...valid, choices: null });
    expect(Array.isArray(coerced.choices)).toBe(true);
    expect(coerced.choices.length).toBe(0);
  });

  it("returns a fallback storylet", () => {
    const fb = fallbackStorylet();
    expect(fb.title.includes("Corrupted")).toBe(true);
    expect(fb.choices[0]?.id).toBe("continue");
  });

  it("accepts probabilistic outcomes with weights", () => {
    const withOutcomes = {
      ...valid,
      choices: [
        {
          id: "A",
          label: "Option A",
          outcomes: [
            { id: "success", weight: 70, text: "ok" },
            { id: "fail", weight: 30, text: "nope" },
          ],
        },
      ],
    };
    const res = validateStorylet(withOutcomes);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid probabilistic outcomes", () => {
    const withBadOutcomes = {
      ...valid,
      choices: [
        {
          id: "A",
          label: "Option A",
          outcomes: [{ id: "oops", weight: 0 }],
        },
      ],
    };
    const res = validateStorylet(withBadOutcomes);
    expect(res.ok).toBe(false);
  });
});
