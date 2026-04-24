import type {
  MiniGameResult,
  StoryletChoice,
  StoryletOutcome,
} from "@/types/storylets";

export function getMiniGameOutcomeId(
  result: MiniGameResult | null | undefined
): "success" | "failure" | undefined {
  if (!result) return undefined;
  return result.won ? "success" : "failure";
}

export function resolveChoiceOutcomeById(
  choice: StoryletChoice | undefined,
  outcomeId: string | undefined
): StoryletOutcome | undefined {
  if (!choice) return undefined;
  if (!choice.outcomes?.length) return choice.outcome;
  if (!outcomeId) return choice.outcome;

  const resolved =
    choice.outcomes.find((outcome) => outcome.id === outcomeId) ??
    choice.outcomes[0];

  if (!resolved) return choice.outcome;

  return {
    text: resolved.text,
    deltas: resolved.deltas,
    anomalies: resolved.anomalies,
  };
}
