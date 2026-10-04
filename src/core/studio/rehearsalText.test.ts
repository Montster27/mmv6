import { describe, expect, it } from "vitest";
import type { RehearsalState } from "./rehearsal";
import { describeRehearsalStep } from "./rehearsalText";

const state = (extra: Partial<RehearsalState> = {}): RehearsalState => ({
  day: 0, segment: "morning", hours: 16, resources: { energy: 70, stress: 20, knowledge: 0, cashOnHand: 0, socialLeverage: 0, physicalResilience: 50, morale: 100 },
  flags: [], precluded: [], trained: [], practiced: [], relationships: {}, next_keys: {}, track_states: {}, resolved: {}, choices: {}, ...extra,
});

describe("describeRehearsalStep", () => {
  it("says nothing when nothing changed", () => expect(describeRehearsalStep(state(), state(), (x) => x)).toEqual([]));
  it("describes time, resources, flags, closures and people in plain sentences", () => {
    const after = state({
      day: 0, segment: "afternoon", flags: ["accepted_the_invitation"], precluded: ["old_scene"],
      resources: { energy: 64, stress: 16, knowledge: 2, cashOnHand: 0, socialLeverage: 0, physicalResilience: 50, morale: 100 },
      relationships: { npc_studious_priya: { relationship: 7 } as never }, resolved: { t1: ["the_hall_phone"] },
    });
    expect(describeRehearsalStep(state(), after, (x) => x)).toEqual([
      "Time moved from day 0 morning to day 0 afternoon.",
      "Energy went from 70 to 64.", "Stress went from 20 to 16.", "Knowledge went from 0 to 2.",
      "Remembered: accepted the invitation.", "Closed off for good: old_scene.",
      "Met studious priya (relationship 7).", "Finished scene “the_hall_phone”.",
    ]);
  });
});
