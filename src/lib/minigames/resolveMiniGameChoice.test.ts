import { describe, expect, it } from "vitest";

import {
  getMiniGameOutcomeId,
  resolveChoiceOutcomeById,
} from "@/lib/minigames/resolveMiniGameChoice";
import type { StoryletChoice } from "@/types/storylets";

describe("resolveMiniGameChoice", () => {
  it("maps result state to outcome ids", () => {
    expect(getMiniGameOutcomeId({ won: true, score: 100 })).toBe("success");
    expect(getMiniGameOutcomeId({ won: false, score: 25 })).toBe("failure");
  });

  it("selects the forced outcome from a choice", () => {
    const choice: StoryletChoice = {
      id: "answer_phone",
      label: "Answer it",
      outcomes: [
        { id: "success", weight: 1, text: "Clean relay." },
        { id: "failure", weight: 1, text: "The message goes sideways." },
      ],
    };

    expect(resolveChoiceOutcomeById(choice, "failure")?.text).toBe(
      "The message goes sideways."
    );
  });
});
