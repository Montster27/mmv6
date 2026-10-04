import { describe, expect, it } from "vitest";
import type { Storylet } from "@/types/storylets";
import { describeChoiceEffects, describeRecordChanges, describeSceneChanges, reactionText, sceneEligibility } from "./sceneText";

const scene = (extra: Record<string, unknown> = {}) =>
  ({ id: "s", slug: "s", storylet_key: "s", title: "T", body: "One two three.", choices: [], requirements: {}, is_active: true, due_offset_days: 2, expires_after_days: 1, segment: "evening", ...extra }) as unknown as Storylet;

describe("describeChoiceEffects", () => {
  it("states costs, gains, flags, closures and state changes plainly", () => {
    const lines = describeChoiceEffects({
      id: "a", label: "A", time_cost: 1, energy_cost: 3, sets_flag: ["met_the_roommate"], precludes: ["old_scene"],
      outcome: { text: "", deltas: { stress: -2, resources: { knowledge: 1 } } }, sets_track_state: { state: "active_engagement" }, identity_tags: ["people"],
    } as never);
    expect(lines).toEqual(expect.arrayContaining([
      "Takes 1 hour", "Costs 3 energy", "Costs 2 stress", "Gains 1 knowledge",
      "Remembers: met the roommate", "Closes off for good: old_scene", "Moves this storyline to “active engagement”", "Kind of choice: people",
    ]));
  });
  it("says nothing for a choice with no effects", () => {
    expect(describeChoiceEffects({ id: "a", label: "A" } as never)).toEqual([]);
  });
  it("reads reaction text from either field", () => {
    expect(reactionText({ id: "a", label: "A", reaction_text: "Hello" } as never)).toBe("Hello");
    expect(reactionText({ id: "a", label: "A", outcome: { text: "Via outcome" } } as never)).toBe("Via outcome");
  });
});

describe("sceneEligibility uses the real selector and explains why not", () => {
  it("is offered on its day and part of day", () => expect(sceneEligibility(scene(), 2, "evening")).toEqual({ offered: true, reason: "Offered." }));
  it("is still offered inside its window", () => expect(sceneEligibility(scene(), 3, "evening").offered).toBe(true));
  it("explains an early day", () => expect(sceneEligibility(scene(), 0, "evening").reason).toMatch(/becomes available on day 2/));
  it("explains an expired window, including the zero-window rule", () => {
    expect(sceneEligibility(scene(), 9, "evening").reason).toMatch(/through day 3/);
    expect(sceneEligibility(scene({ expires_after_days: 0 }), 9, "evening").reason).toMatch(/that day only/);
  });
  it("explains the wrong part of day", () => expect(sceneEligibility(scene(), 2, "morning").reason).toMatch(/for the evening, not the morning/));
  it("warns about requirements the preview cannot know", () => {
    const r = sceneEligibility(scene({ requirements: { requires_flag: "spoke_to_him" } }), 2, "evening");
    expect(r.offered).toBe(false);
  });
});

describe("change descriptions", () => {
  it("lists scene changes one line each", () => {
    const before = scene({ choices: [{ id: "a", label: "Wait", energy_cost: 1 }, { id: "b", label: "Go" }] }) as unknown as Record<string, unknown>;
    const after = scene({ title: "T2", body: "One two three four five.", due_offset_days: 3, choices: [{ id: "a", label: "Wait", energy_cost: 3 }, { id: "c", label: "Knock" }] }) as unknown as Record<string, unknown>;
    const lines = describeSceneChanges(before, after);
    expect(lines).toEqual(expect.arrayContaining([
      "Title changed from “T” to “T2”.", "Scene text rewritten (3 → 5 words).", "Available from day: 2 → 3.",
      "“Wait”: now — costs 3 energy.", "“Wait”: no longer — costs 1 energy.", "Choice added: “Knock”.", "Choice removed: “Go”.",
    ]));
  });
  it("handles new and removed", () => {
    expect(describeSceneChanges(null, scene() as never)).toEqual(["New scene."]);
    expect(describeSceneChanges(scene() as never, null)).toEqual(["Scene removed."]);
  });
  it("describes plans without dumping JSON", () => {
    const lines = describeRecordChanges({ id: "p", title: "Arc", timing: "Thursday", storylet_ids: ["a"] }, { id: "p", title: "Arc", timing: "Friday", storylet_ids: ["a", "b"] });
    expect(lines).toEqual(["timing: “Thursday” → “Friday”.", "storylet ids: added 1 (b)."]);
  });
});
