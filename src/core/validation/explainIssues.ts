import type { Storylet, StoryletChoice } from "@/types/storylets";
import { authoringWarnings, validateStoryletIssues, type ValidationIssue } from "./storyletValidation";

export type GuidedIssue = {
  id: string;
  severity: "error" | "warning";
  /** One short sentence naming the problem. */
  title: string;
  /** Why it matters, in plain language. */
  why: string;
  /** Where to look, e.g. “Choice 2”. */
  where: string;
  /** A change that is safe to apply automatically. */
  fix?: { label: string; apply: (scene: Storylet) => Storylet };
  raw: ValidationIssue;
};

const KINDS = "risk, people, achieve or safety";

function choiceIndex(path: string): number | null {
  const match = /^choices\[(\d+)\]/.exec(path);
  return match ? Number(match[1]) : null;
}
function withChoice(scene: Storylet, index: number, change: Partial<StoryletChoice> & Record<string, unknown>): Storylet {
  const choices = (scene.choices ?? []).map((choice, i) => (i === index ? ({ ...choice, ...change } as StoryletChoice) : choice));
  return { ...scene, choices };
}
const label = (scene: Storylet, index: number | null) =>
  index === null ? "This scene" : `Choice ${index + 1}${scene.choices?.[index]?.label ? ` (“${scene.choices[index].label}”)` : ""}`;

/** Translate one raw validator issue into something a first-time writer can act on. */
export function explainIssue(scene: Storylet, issue: ValidationIssue, severity: "error" | "warning"): GuidedIssue {
  const index = choiceIndex(issue.path);
  const where = label(scene, index);
  const base = { id: `${severity}:${issue.path}:${issue.message}`, severity, where, raw: issue };

  if (/precludes/.test(issue.path)) {
    return { ...base, title: "Say whether this choice closes anything off",
      why: "Every choice states what it makes impossible. For most choices the answer is nothing, and that is fine.",
      fix: index === null ? undefined : { label: "It closes nothing off", apply: (s) => withChoice(s, index, { precludes: [] }) } };
  }
  if (/identity_tags/.test(issue.path)) {
    const unknown = /Unknown kind/.test(issue.message);
    return { ...base, title: unknown ? "Pick one of the four kinds of choice" : "Say what kind of choice this is",
      why: `Each choice is tagged ${KINDS}. The tag describes the character the player is becoming; it does not change the story directly.`,
      fix: index === null ? undefined : { label: "Mark it “safety” (change later if wrong)", apply: (s) => withChoice(s, index, { identity_tags: ["safety"] }) } };
  }
  if (/reaction_text/.test(issue.path)) {
    return { ...base, title: "Write what the player reads after choosing this",
      why: "After a choice the player should see a line or two of reaction. Without it the choice feels like it did nothing." };
  }
  if (/example text/.test(issue.message)) {
    return { ...base, title: "Replace the example text with your own",
      why: "This scene still begins with the template’s example wording. Rewrite it, then delete the line that starts “(Example — replace…)”." };
  }
  if (issue.path === "title") return { ...base, title: "Give the scene a title", why: "Titles appear on the menu of moments the player picks from." };
  if (issue.path === "body") {
    return { ...base, title: /long/.test(issue.message) ? "This scene is long" : "Write the scene text",
      why: /long/.test(issue.message) ? "Scenes read best at under about 300 words. Consider splitting it into two." : "The body is what the player reads before they choose." };
  }
  if (issue.path === "choices" && /non-empty/.test(issue.message)) {
    return { ...base, title: "Add at least one choice", why: "A scene needs something for the player to do." };
  }
  if (/\.label$/.test(issue.path)) return { ...base, title: "Give this choice a label", why: "The label is the button text. Keep it short and physical, like “Pick up the phone”." };
  if (/name|introduce|Name/.test(issue.message) && /npc|NPC|before/.test(issue.message)) {
    return { ...base, title: "A person is named before the player could know them",
      why: "Names must not appear until the player has met the character. Use “the man at the desk” until the scene that introduces them, then mark that scene as introducing them." };
  }
  if (/^(due_offset_days|expires_after_days)/.test(issue.path)) {
    return { ...base, title: "Days must be whole numbers, 0 or more", why: "Day 0 is the first day. A window of 0 means the scene is offered that day only." };
  }
  return { ...base, title: issue.message, why: "Open the Structured tab for this field." };
}

export function guidedIssues(scene: Storylet): GuidedIssue[] {
  const { errors, warnings } = validateStoryletIssues(scene);
  return [
    ...errors.map((issue) => explainIssue(scene, issue, "error")),
    ...[...warnings, ...authoringWarnings(scene)].map((issue) => explainIssue(scene, issue, "warning")),
  ];
}

/** Apply every safe automatic fix at once. */
export function applyAllFixes(scene: Storylet): Storylet {
  return guidedIssues(scene).reduce((current, issue) => (issue.fix ? issue.fix.apply(current) : current), scene);
}
