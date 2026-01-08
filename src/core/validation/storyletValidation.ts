import type {
  Storylet,
  StoryletChoice,
  StoryletOutcome,
  StoryletOutcomeOption,
} from "@/types/storylets";
import type { JsonObject } from "@/types/vectors";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function coerceChoice(raw: unknown): StoryletChoice | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isString(obj.id) || !isString(obj.label)) return null;
  const outcome = obj.outcome;
  const outcomeObj =
    outcome && typeof outcome === "object" && !Array.isArray(outcome)
      ? (outcome as JsonObject)
      : undefined;
  const outcomesRaw = Array.isArray(obj.outcomes) ? obj.outcomes : undefined;
  const outcomes = outcomesRaw
    ?.map((item) => coerceOutcomeOption(item))
    .filter((item): item is StoryletOutcomeOption => Boolean(item));
  return {
    id: obj.id,
    label: obj.label,
    outcome: outcomeObj as StoryletOutcome | undefined,
    outcomes,
  };
}

function coerceOutcomeOption(raw: unknown): StoryletOutcomeOption | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isString(obj.id)) return null;
  if (typeof obj.weight !== "number") return null;
  const outcome = obj as JsonObject;
  return outcome as StoryletOutcomeOption;
}

export function coerceStoryletRow(row: any): Storylet {
  const choicesRaw = Array.isArray(row?.choices) ? row.choices : [];
  const choices: StoryletChoice[] = choicesRaw
    .map(coerceChoice)
    .filter((c: StoryletChoice | null): c is StoryletChoice => Boolean(c));

  return {
    id: isString(row?.id) ? row.id : "",
    slug: isString(row?.slug) ? row.slug : "",
    title: isString(row?.title) ? row.title : "",
    body: isString(row?.body) ? row.body : "",
    choices,
    is_active: Boolean(row?.is_active),
    created_at: isString(row?.created_at) ? row.created_at : undefined,
    tags: Array.isArray(row?.tags)
      ? (row.tags as unknown[]).filter((t) => typeof t === "string") as string[]
      : [],
    requirements:
      row?.requirements && typeof row.requirements === "object"
        ? (row.requirements as Record<string, unknown>)
        : {},
    weight: typeof row?.weight === "number" ? row.weight : 100,
  };
}

export function validateStorylet(
  input: unknown
): { ok: true; value: Storylet } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["Storylet is not an object"] };
  }
  const storylet = input as Storylet;

  if (!isString(storylet.id) || !storylet.id) errors.push("Missing id");
  if (!isString(storylet.slug) || !storylet.slug) errors.push("Missing slug");
  if (!isString(storylet.title) || !storylet.title) errors.push("Missing title");
  if (!isString(storylet.body) || !storylet.body) errors.push("Missing body");

  if (!Array.isArray(storylet.choices)) {
    errors.push("Choices must be an array");
  } else {
    storylet.choices.forEach((choice, idx) => {
      if (!choice || typeof choice !== "object") {
        errors.push(`Choice ${idx} is not an object`);
        return;
      }
      if (!isString((choice as any).id) || !(choice as any).id) {
        errors.push(`Choice ${idx} missing id`);
      }
      if (!isString((choice as any).label) || !(choice as any).label) {
        errors.push(`Choice ${idx} missing label`);
      }
      if (
        (choice as any).outcome &&
        (typeof (choice as any).outcome !== "object" ||
          Array.isArray((choice as any).outcome))
      ) {
        errors.push(`Choice ${idx} outcome must be an object if present`);
      }
      if ((choice as any).outcomes) {
        if (!Array.isArray((choice as any).outcomes)) {
          errors.push(`Choice ${idx} outcomes must be an array if present`);
        } else if ((choice as any).outcomes.length === 0) {
          errors.push(`Choice ${idx} outcomes must be non-empty`);
        } else {
          (choice as any).outcomes.forEach((outcome: any, oIdx: number) => {
            if (!outcome || typeof outcome !== "object") {
              errors.push(`Choice ${idx} outcome ${oIdx} is not an object`);
              return;
            }
            if (!isString(outcome.id) || !outcome.id) {
              errors.push(`Choice ${idx} outcome ${oIdx} missing id`);
            }
            if (typeof outcome.weight !== "number" || outcome.weight <= 0) {
              errors.push(`Choice ${idx} outcome ${oIdx} weight must be > 0`);
            }
            if (outcome.modifiers) {
              if (typeof outcome.modifiers !== "object" || Array.isArray(outcome.modifiers)) {
                errors.push(`Choice ${idx} outcome ${oIdx} modifiers must be an object`);
              } else {
                if (
                  outcome.modifiers.vector !== undefined &&
                  !isString(outcome.modifiers.vector)
                ) {
                  errors.push(`Choice ${idx} outcome ${oIdx} modifiers.vector must be a string`);
                }
                if (
                  outcome.modifiers.per10 !== undefined &&
                  typeof outcome.modifiers.per10 !== "number"
                ) {
                  errors.push(`Choice ${idx} outcome ${oIdx} modifiers.per10 must be a number`);
                }
              }
            }
          });
        }
      }
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: storylet };
}

export function fallbackStorylet(): Storylet {
  return {
    id: "corrupted-storylet",
    slug: "corrupted-storylet",
    title: "Corrupted Storylet",
    body: "This event could not be loaded. Please continue.",
    choices: [{ id: "continue", label: "Continue" }],
    is_active: false,
  };
}
