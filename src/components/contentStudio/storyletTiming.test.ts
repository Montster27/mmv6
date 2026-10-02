import { describe, expect, it } from "vitest";
import type { Storylet } from "@/types/storylets";
import { availableOnTrackDay } from "./storyletTiming";

const scene = { track_id: "roommate", due_offset_days: 1, expires_after_days: 2 } as Storylet;

describe("Content Studio timing calendar", () => {
  it("shows each day in an inclusive availability window", () => {
    expect([0, 1, 2, 3, 4].filter((day) => availableOnTrackDay(scene, day))).toEqual([1, 2, 3]);
  });

  it("shows a fixed appointment only on its due day", () => {
    const fixed = { ...scene, expires_after_days: 0 };
    expect([0, 1, 2].filter((day) => availableOnTrackDay(fixed, day))).toEqual([1]);
  });
});
