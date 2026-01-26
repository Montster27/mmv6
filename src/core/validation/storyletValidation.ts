import type {
  Storylet,
  StoryletChoice,
  StoryletOutcome,
  StoryletOutcomeOption,
} from "@/types/storylets";
import type { Check } from "@/types/checks";
import type { JsonObject } from "@/types/vectors";
import { ARC_DEFINITIONS } from "@/content/arcs/arcDefinitions";

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
  const checkRaw =
    obj.check && typeof obj.check === "object" && !Array.isArray(obj.check)
      ? (obj.check as Check)
      : undefined;
  return {
    id: obj.id,
    label: obj.label,
    outcome: outcomeObj as StoryletOutcome | undefined,
    outcomes,
    check: checkRaw,
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
  const { errors } = validateStoryletIssues(input);
  if (errors.length) {
    return { ok: false, errors: errors.map((err) => err.message) };
  }
  return { ok: true, value: input as Storylet };
}

export type ValidationIssue = {
  storyletId: string;
  slug: string;
  path: string;
  message: string;
};

const KNOWN_REQUIREMENT_KEYS = new Set([
  "min_day_index",
  "max_day_index",
  "requires_tags_any",
  "vectors_min",
  "min_season_index",
  "max_season_index",
  "seasons_any",
  "audience",
]);

function addIssue(
  list: ValidationIssue[],
  storylet: Partial<Storylet>,
  path: string,
  message: string
) {
  list.push({
    storyletId: isString(storylet.id) ? storylet.id : "",
    slug: isString(storylet.slug) ? storylet.slug : "",
    path,
    message,
  });
}

export function validateStoryletIssues(
  input: unknown
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!input || typeof input !== "object") {
    return {
      errors: [
        {
          storyletId: "",
          slug: "",
          path: "storylet",
          message: "Storylet is not an object",
        },
      ],
      warnings: [],
    };
  }
  const storylet = input as Storylet;

  if (!isString(storylet.id) || !storylet.id) {
    addIssue(errors, storylet, "id", "Missing id");
  }
  if (!isString(storylet.slug) || !storylet.slug) {
    addIssue(errors, storylet, "slug", "Missing slug");
  }
  if (!isString(storylet.title) || !storylet.title) {
    addIssue(errors, storylet, "title", "Missing title");
  }
  if (!isString(storylet.body) || !storylet.body) {
    addIssue(errors, storylet, "body", "Missing body");
  } else if (storylet.body.length > 2000) {
    addIssue(warnings, storylet, "body", "Body is unusually long");
  }

  if (!Array.isArray(storylet.choices)) {
    addIssue(errors, storylet, "choices", "Choices must be an array");
  } else {
    if (storylet.choices.length === 0) {
      addIssue(errors, storylet, "choices", "Choices must be non-empty");
    }
    const choiceIds = new Set<string>();
    storylet.choices.forEach((choice, idx) => {
      if (!choice || typeof choice !== "object") {
        addIssue(errors, storylet, `choices[${idx}]`, "Choice is not an object");
        return;
      }
      if (!isString((choice as any).id) || !(choice as any).id) {
        addIssue(errors, storylet, `choices[${idx}].id`, "Choice missing id");
      } else if (choiceIds.has((choice as any).id)) {
        addIssue(errors, storylet, `choices[${idx}].id`, "Choice id must be unique");
      } else {
        choiceIds.add((choice as any).id);
      }
      if (!isString((choice as any).label) || !(choice as any).label) {
        addIssue(errors, storylet, `choices[${idx}].label`, "Choice missing label");
      }
      if (
        (choice as any).outcome &&
        (typeof (choice as any).outcome !== "object" ||
          Array.isArray((choice as any).outcome))
      ) {
        addIssue(
          errors,
          storylet,
          `choices[${idx}].outcome`,
          "Outcome must be an object if present"
        );
      } else if ((choice as any).outcome?.anomalies) {
        const anomalies = (choice as any).outcome.anomalies;
        if (!Array.isArray(anomalies) || anomalies.some((a: any) => !isString(a))) {
          addIssue(
            errors,
            storylet,
            `choices[${idx}].outcome.anomalies`,
            "Outcome anomalies must be an array of strings"
          );
        }
      }
      if ((choice as any).outcomes) {
        if (!Array.isArray((choice as any).outcomes)) {
          addIssue(
            errors,
            storylet,
            `choices[${idx}].outcomes`,
            "Outcomes must be an array if present"
          );
        } else if ((choice as any).outcomes.length === 0) {
          addIssue(
            errors,
            storylet,
            `choices[${idx}].outcomes`,
            "Outcomes must be non-empty"
          );
        } else {
          const outcomeIds = new Set<string>();
          let weightSum = 0;
          (choice as any).outcomes.forEach((outcome: any, oIdx: number) => {
            if (!outcome || typeof outcome !== "object") {
              addIssue(
                errors,
                storylet,
                `choices[${idx}].outcomes[${oIdx}]`,
                "Outcome is not an object"
              );
              return;
            }
            if (!isString(outcome.id) || !outcome.id) {
              addIssue(
                errors,
                storylet,
                `choices[${idx}].outcomes[${oIdx}].id`,
                "Outcome missing id"
              );
            } else if (outcomeIds.has(outcome.id)) {
              addIssue(
                errors,
                storylet,
                `choices[${idx}].outcomes[${oIdx}].id`,
                "Outcome id must be unique"
              );
            } else {
              outcomeIds.add(outcome.id);
            }
            if (typeof outcome.weight !== "number" || outcome.weight <= 0) {
              addIssue(
                errors,
                storylet,
                `choices[${idx}].outcomes[${oIdx}].weight`,
                "Outcome weight must be > 0"
              );
            } else {
              weightSum += outcome.weight;
            }
            if (outcome.modifiers) {
              if (typeof outcome.modifiers !== "object" || Array.isArray(outcome.modifiers)) {
                addIssue(
                  errors,
                  storylet,
                  `choices[${idx}].outcomes[${oIdx}].modifiers`,
                  "Modifiers must be an object"
                );
              } else {
                if (
                  outcome.modifiers.vector !== undefined &&
                  !isString(outcome.modifiers.vector)
                ) {
                  addIssue(
                    errors,
                    storylet,
                    `choices[${idx}].outcomes[${oIdx}].modifiers.vector`,
                    "Modifiers.vector must be a string"
                  );
                }
                if (
                  outcome.modifiers.per10 !== undefined &&
                  typeof outcome.modifiers.per10 !== "number"
                ) {
                  addIssue(
                    errors,
                    storylet,
                    `choices[${idx}].outcomes[${oIdx}].modifiers.per10`,
                    "Modifiers.per10 must be a number"
                  );
                }
              }
            }
            if (outcome.anomalies) {
              if (!Array.isArray(outcome.anomalies)) {
                addIssue(
                  errors,
                  storylet,
                  `choices[${idx}].outcomes[${oIdx}].anomalies`,
                  "Outcome anomalies must be an array"
                );
              } else if (outcome.anomalies.some((a: any) => !isString(a))) {
                addIssue(
                  errors,
                  storylet,
                  `choices[${idx}].outcomes[${oIdx}].anomalies`,
                  "Outcome anomalies must be strings"
                );
              }
            }
          });
          if (weightSum > 1000) {
            addIssue(
              warnings,
              storylet,
              `choices[${idx}].outcomes`,
              "Total outcome weight is unusually high"
            );
          }
        }
      }
      if ((choice as any).check) {
        const check = (choice as any).check as Check;
        if (!check || typeof check !== "object") {
          addIssue(
            errors,
            storylet,
            `choices[${idx}].check`,
            "Check must be an object"
          );
        } else {
          if (!isString(check.id) || !check.id) {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.id`,
              "Check id must be a string"
            );
          }
          if (typeof check.baseChance !== "number") {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.baseChance`,
              "Check baseChance must be a number"
            );
          } else if (check.baseChance < 0 || check.baseChance > 1) {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.baseChance`,
              "Check baseChance must be between 0 and 1"
            );
          }
          if (
            check.skillWeights &&
            (typeof check.skillWeights !== "object" ||
              Array.isArray(check.skillWeights))
          ) {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.skillWeights`,
              "Check skillWeights must be an object"
            );
          }
          if (check.energyWeight !== undefined && typeof check.energyWeight !== "number") {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.energyWeight`,
              "Check energyWeight must be a number"
            );
          }
          if (check.stressWeight !== undefined && typeof check.stressWeight !== "number") {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.stressWeight`,
              "Check stressWeight must be a number"
            );
          }
          if (
            check.postureBonus &&
            (typeof check.postureBonus !== "object" ||
              Array.isArray(check.postureBonus))
          ) {
            addIssue(
              errors,
              storylet,
              `choices[${idx}].check.postureBonus`,
              "Check postureBonus must be an object"
            );
          }
        }
      }
    });
  }

  if (storylet.requirements && typeof storylet.requirements === "object") {
    const req = storylet.requirements as Record<string, unknown>;
    const minSeason = req.min_season_index;
    const maxSeason = req.max_season_index;
    if (minSeason !== undefined && typeof minSeason !== "number") {
      addIssue(
        errors,
        storylet,
        "requirements.min_season_index",
        "requirements.min_season_index must be a number"
      );
    }
    if (maxSeason !== undefined && typeof maxSeason !== "number") {
      addIssue(
        errors,
        storylet,
        "requirements.max_season_index",
        "requirements.max_season_index must be a number"
      );
    }
    if (
      typeof minSeason === "number" &&
      typeof maxSeason === "number" &&
      minSeason > maxSeason
    ) {
      addIssue(
        errors,
        storylet,
        "requirements.min_season_index",
        "requirements.min_season_index cannot exceed max_season_index"
      );
    }
    if (req.seasons_any !== undefined) {
      if (!Array.isArray(req.seasons_any)) {
        addIssue(
          errors,
          storylet,
          "requirements.seasons_any",
          "requirements.seasons_any must be an array of numbers"
        );
      } else if (req.seasons_any.some((v) => typeof v !== "number" || !Number.isInteger(v))) {
        addIssue(
          errors,
          storylet,
          "requirements.seasons_any",
          "requirements.seasons_any must be an array of integers"
        );
      }
    }
    if (req.audience !== undefined) {
      if (!req.audience || typeof req.audience !== "object" || Array.isArray(req.audience)) {
        addIssue(errors, storylet, "requirements.audience", "Audience must be an object");
      } else {
        const audience = req.audience as Record<string, unknown>;
        if (
          audience.rollout_pct !== undefined &&
          (typeof audience.rollout_pct !== "number" ||
            audience.rollout_pct < 0 ||
            audience.rollout_pct > 100)
        ) {
          addIssue(
            errors,
            storylet,
            "requirements.audience.rollout_pct",
            "rollout_pct must be a number between 0 and 100"
          );
        }
        if (audience.allow_admin !== undefined && typeof audience.allow_admin !== "boolean") {
          addIssue(
            errors,
            storylet,
            "requirements.audience.allow_admin",
            "allow_admin must be a boolean"
          );
        }
        if (audience.experiment !== undefined) {
          if (!audience.experiment || typeof audience.experiment !== "object") {
            addIssue(
              errors,
              storylet,
              "requirements.audience.experiment",
              "experiment must be an object"
            );
          } else {
            const exp = audience.experiment as Record<string, unknown>;
            if (!isString(exp.id) || !exp.id) {
              addIssue(
                errors,
                storylet,
                "requirements.audience.experiment.id",
                "experiment.id must be a string"
              );
            }
            if (exp.variants_any !== undefined) {
              if (!Array.isArray(exp.variants_any)) {
                addIssue(
                  errors,
                  storylet,
                  "requirements.audience.experiment.variants_any",
                  "variants_any must be an array of strings"
                );
              } else if (
                exp.variants_any.some((v) => !isString(v))
              ) {
                addIssue(
                  errors,
                  storylet,
                  "requirements.audience.experiment.variants_any",
                  "variants_any must be an array of strings"
                );
              }
            }
          }
        }
      }
    }
    Object.keys(req).forEach((key) => {
      if (!KNOWN_REQUIREMENT_KEYS.has(key)) {
        addIssue(
          warnings,
          storylet,
          `requirements.${key}`,
          "Unknown requirements key"
        );
      }
    });
  }

  return { errors, warnings };
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

export function validateArcDefinitions(storylets: Storylet[]) {
  const warnings: ValidationIssue[] = [];
  const bySlug = new Map(storylets.map((s) => [s.slug, s]));
  ARC_DEFINITIONS.forEach((arc) => {
    arc.steps.forEach((step) => {
      const storylet = bySlug.get(step.storylet_slug);
      if (!storylet) {
        warnings.push({
          storyletId: "",
          slug: step.storylet_slug,
          path: `arc.${arc.arc_id}.${step.step_id}`,
          message: "Arc step storylet slug not found",
        });
        return;
      }
      if (!storylet.is_active) {
        warnings.push({
          storyletId: storylet.id,
          slug: storylet.slug,
          path: `arc.${arc.arc_id}.${step.step_id}`,
          message: "Arc step storylet is inactive",
        });
      }
    });
  });
  return warnings;
}
