import type { StoryletChoice } from "@/types/storylets";
import type { TrackKey } from "@/types/tracks";

/** Marker at the start of template text. A check flags it so example prose is never published by accident. */
export const EXAMPLE_MARKER = "(Example — replace with your own.)";

export type SceneTemplate = {
  id: string;
  label: string;
  blurb: string;
  title: string;
  body: string;
  choices: StoryletChoice[];
};

const c = (id: string, label: string, reaction_text: string, tags: string[], extra: Record<string, unknown> = {}): StoryletChoice =>
  ({ id, label, reaction_text, identity_tags: tags, precludes: [], time_cost: 0, energy_cost: 0, ...extra }) as StoryletChoice;

export const SCENE_TEMPLATES: SceneTemplate[] = [
  {
    id: "invitation",
    label: "An invitation you can decline",
    blurb: "Someone offers the player something. Saying yes is remembered; saying no costs nothing.",
    title: "An empty chair",
    body: `${EXAMPLE_MARKER} Someone at the next table nods toward the empty chair beside them and says there is room, if you want it. They go back to their tray as though it makes no difference either way.`,
    choices: [
      c("accept", "Sit down", "The chair scrapes. Nobody looks up, and that turns out to be a kindness.", ["people"], { sets_flag: ["accepted_the_invitation"] }),
      c("decline", "Say you are fine where you are", "“Sure,” they say, and it is not unfriendly. The chair stays empty.", ["safety"]),
    ],
  },
  {
    id: "quiet",
    label: "A quiet moment",
    blurb: "A small, low-stakes scene that lets the player breathe. Good for pacing.",
    title: "After lights out",
    body: `${EXAMPLE_MARKER} The hall has gone quiet in the way a hall does when everyone is pretending to be asleep. A radiator knocks twice, then thinks better of it.`,
    choices: [
      c("stay_put", "Stay where you are and listen", "The building settles around you. You have not heard it before.", ["safety"]),
      c("walk_out", "Walk to the end of the hall", "The linoleum is cold through your socks. At the window, the quad is empty and lit.", ["risk"], { energy_cost: 1 }),
    ],
  },
  {
    id: "effort",
    label: "A choice with a cost and a reward",
    blurb: "Putting in effort spends energy and earns something. Letting it go is also valid.",
    title: "The extra reading",
    body: `${EXAMPLE_MARKER} There is a second stack on the reserve shelf, the optional one. Nobody has touched it; the rubber band has gone soft.`,
    choices: [
      c("put_in_the_effort", "Take the stack to a carrel", "Forty minutes later you have read three pages twice, and one of them stays with you.", ["achieve"], { energy_cost: 3, outcome: { text: "", deltas: { resources: { knowledge: 1 } } } }),
      c("let_it_go", "Leave it for someone else", "You hand the rubber band back to the shelf, as if it might want it.", ["safety"]),
    ],
  },
  {
    id: "blank",
    label: "Start from a blank page",
    blurb: "Two empty choices, nothing else.",
    title: "",
    body: "",
    choices: [c("choice_1", "", "", []), c("choice_2", "", "", [])],
  },
];

export const TRACK_BLURBS: Record<TrackKey, { label: string; blurb: string }> = {
  roommate: { label: "The Roommate", blurb: "The person you share a room with." },
  academic: { label: "Academic Footing", blurb: "Classes, reading and where you stand." },
  money: { label: "Money Reality", blurb: "What things cost and how you cope." },
  belonging: { label: "Finding Your People", blurb: "Floor life, clubs and friends." },
  opportunity: { label: "First Opportunity", blurb: "Jobs and chances that pass quickly." },
  home: { label: "Something From Home", blurb: "Calls, letters and family." },
};

export function slugify(text: string): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base || "new_scene";
}

/** A key that does not collide with any existing scene on the same track. */
export function uniqueSceneKey(title: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(title);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Build the record the Studio saves for a wizard-written scene. */
export function newSceneRecord(input: {
  title: string; body: string; choices: StoryletChoice[]; trackId: string; trackKey: string;
  segment: string; day: number; windowDays: number; orderIndex: number; takenKeys: Iterable<string>; takenSlugs?: Iterable<string>;
}): Record<string, unknown> {
  const key = uniqueSceneKey(input.title, input.takenKeys);
  const slug = uniqueSceneKey(input.title, input.takenSlugs ?? input.takenKeys);
  return {
    slug, storylet_key: key, step_key: key, title: input.title.trim(), body: input.body.trim(), choices: input.choices,
    tags: [input.trackKey], requirements: {}, weight: 1, is_active: true, track_id: input.trackId,
    order_index: input.orderIndex, due_offset_days: input.day, expires_after_days: input.windowDays, segment: input.segment,
  };
}
