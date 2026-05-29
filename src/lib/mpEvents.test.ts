import { describe, expect, it } from "vitest";

import {
  locationStateClasses,
  locationStateLabel,
  locationTypeLabel,
} from "./mpEvents";
import type {
  MpEventLocationState,
  MpEventLocationType,
} from "@/types/mpEvents";

// ─────────────────────────────────────────────────────────────────────
// locationStateLabel
// ─────────────────────────────────────────────────────────────────────

describe("locationStateLabel", () => {
  it("labels every state", () => {
    const expected: Record<MpEventLocationState, string> = {
      contested: "Contested",
      leaning_pro: "Leaning pro",
      leaning_con: "Leaning con",
      locked_pro: "Locked pro",
      locked_con: "Locked con",
    };
    for (const [state, label] of Object.entries(expected)) {
      expect(locationStateLabel(state as MpEventLocationState)).toBe(label);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// locationStateClasses — the heatmap color coding
// ─────────────────────────────────────────────────────────────────────

describe("locationStateClasses", () => {
  it("maps contested to neutral gray, pro to green, con to red", () => {
    expect(locationStateClasses("contested")).toContain("slate");
    expect(locationStateClasses("leaning_pro")).toContain("green");
    expect(locationStateClasses("locked_pro")).toContain("green");
    expect(locationStateClasses("leaning_con")).toContain("red");
    expect(locationStateClasses("locked_con")).toContain("red");
  });

  it("uses light tints for leaning and solid fills for locked", () => {
    expect(locationStateClasses("leaning_pro")).toContain("bg-green-100");
    expect(locationStateClasses("leaning_con")).toContain("bg-red-100");
    expect(locationStateClasses("locked_pro")).toContain("bg-green-600");
    expect(locationStateClasses("locked_pro")).toContain("text-white");
    expect(locationStateClasses("locked_con")).toContain("bg-red-600");
    expect(locationStateClasses("locked_con")).toContain("text-white");
  });

  it("gives every state a distinct class string", () => {
    const states: MpEventLocationState[] = [
      "contested",
      "leaning_pro",
      "leaning_con",
      "locked_pro",
      "locked_con",
    ];
    const classes = states.map(locationStateClasses);
    expect(new Set(classes).size).toBe(states.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// locationTypeLabel
// ─────────────────────────────────────────────────────────────────────

describe("locationTypeLabel", () => {
  it("labels every location type", () => {
    const expected: Record<MpEventLocationType, string> = {
      dorm: "Dorm",
      dining: "Dining hall",
      social: "Social",
      academic: "Academic",
      admin: "Admin",
      merchant: "Merchant",
      other: "Other",
    };
    for (const [type, label] of Object.entries(expected)) {
      expect(locationTypeLabel(type as MpEventLocationType)).toBe(label);
    }
  });
});
