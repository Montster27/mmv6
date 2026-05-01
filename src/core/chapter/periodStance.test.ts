import { describe, expect, it } from "vitest";

import {
  bumpPeriodStance,
  getDominantPeriodStance,
  periodStanceCount,
} from "@/core/chapter/state";
import type { PeriodStanceState } from "@/core/chapter/types";

const zero: PeriodStanceState = { challenged: 0, deflected: 0, absorbed: 0 };

describe("bumpPeriodStance", () => {
  it("increments a valid tag", () => {
    const next = bumpPeriodStance(zero, "challenged");
    expect(next).toEqual({ challenged: 1, deflected: 0, absorbed: 0 });
  });

  it("leaves state unchanged for an unknown tag", () => {
    const next = bumpPeriodStance(zero, "unknown");
    expect(next).toBe(zero);
  });

  it("leaves state unchanged for a non-string input", () => {
    const next = bumpPeriodStance(zero, null);
    expect(next).toBe(zero);
  });

  it("does not mutate the input", () => {
    const input = { ...zero };
    bumpPeriodStance(input, "deflected");
    expect(input).toEqual(zero);
  });
});

describe("periodStanceCount", () => {
  it("returns 0 for an unvisited tag", () => {
    expect(periodStanceCount(zero, "challenged")).toBe(0);
  });

  it("returns the count after bumps", () => {
    const a = bumpPeriodStance(zero, "absorbed");
    const b = bumpPeriodStance(a, "absorbed");
    expect(periodStanceCount(b, "absorbed")).toBe(2);
  });
});

describe("getDominantPeriodStance", () => {
  it("returns null when all counts are zero", () => {
    expect(getDominantPeriodStance(zero)).toBeNull();
  });

  it("returns the single leading tag", () => {
    const state: PeriodStanceState = { challenged: 3, deflected: 1, absorbed: 0 };
    expect(getDominantPeriodStance(state)).toBe("challenged");
  });

  it("returns null on a tie", () => {
    const state: PeriodStanceState = { challenged: 2, deflected: 2, absorbed: 0 };
    expect(getDominantPeriodStance(state)).toBeNull();
  });
});
