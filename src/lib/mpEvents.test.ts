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
      contested:   "Contested",
      leaning_yes: "Warming",
      leaning_no:  "Cooling",
      won:         "With you",
      lost:        "Against",
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
  it("maps contested to neutral gray, yes-side to green, no-side to red", () => {
    expect(locationStateClasses("contested")).toContain("slate");
    expect(locationStateClasses("leaning_yes")).toContain("green");
    expect(locationStateClasses("won")).toContain("green");
    expect(locationStateClasses("leaning_no")).toContain("red");
    expect(locationStateClasses("lost")).toContain("red");
  });

  it("uses light tints for leaning and solid fills for won/lost", () => {
    expect(locationStateClasses("leaning_yes")).toContain("bg-green-100");
    expect(locationStateClasses("leaning_no")).toContain("bg-red-100");
    expect(locationStateClasses("won")).toContain("bg-green-600");
    expect(locationStateClasses("won")).toContain("text-white");
    expect(locationStateClasses("lost")).toContain("bg-red-600");
    expect(locationStateClasses("lost")).toContain("text-white");
  });

  it("gives every state a distinct class string", () => {
    const states: MpEventLocationState[] = [
      "contested",
      "leaning_yes",
      "leaning_no",
      "won",
      "lost",
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
