import { CHAPTER_ONE_TRACK_KEYS } from "@/types/tracks";
import type { StudioChange, StudioKind, StudioManifest, StudioRecord } from "@/types/studio";
import { recordId } from "./manifest";

/**
 * A tiny set of original scenes — one opener per Chapter One track, plus two follow-ups —
 * so a new run still boots after the old catalog is cleared, and so a first-time writer
 * has working examples to copy: a flag set in one scene and read in another, a
 * prerequisite chain, a track-state change, and costs.
 *
 * No named people appear, so nothing here can collide with the name-discipline rule.
 * Replace these scenes as real content arrives.
 */
const uuid = (n: number) => `5a000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const STARTER_TAG = "starter";

type StarterScene = {
  n: number;
  track: (typeof CHAPTER_ONE_TRACK_KEYS)[number];
  key: string;
  title: string;
  body: string;
  segment: "morning" | "afternoon" | "evening";
  due: number;
  window: number;
  order: number;
  requirements?: StudioRecord;
  choices: StudioRecord[];
};

type Tag = "risk" | "people" | "achieve" | "safety";
const choice = (
  id: string,
  label: string,
  reaction_text: string,
  tags: Tag[],
  extra: StudioRecord = {}
): StudioRecord => ({
  id,
  label,
  reaction_text,
  identity_tags: tags,
  time_cost: 0,
  energy_cost: 0,
  // Every choice states what it closes off. An empty list means "nothing".
  precludes: [],
  ...extra,
});

const SCENES: StarterScene[] = [
  {
    n: 1, track: "roommate", key: "starter_roommate_desk", segment: "morning", due: 0, window: 2, order: 1,
    title: "The other half of the room",
    body:
      "The bed across from yours is already made, a gray blanket pulled tight enough to bounce a coin. His desk is bare except for a typewriter case and a mug of pens. The window above your own desk has been painted shut, and the radiator beneath it ticks like something cooling.",
    choices: [
      choice(
        "mention_window",
        "Ask if he minds the window being stuck",
        "He looks up at it as though for the first time. “It’s always been like that,” he says. “I think it’s the paint.” Neither of you moves toward it, but it is something you have said to each other.",
        ["people"],
        { sets_flag: ["starter_roommate_spoke"] }
      ),
      choice(
        "unpack_quietly",
        "Unpack and keep your head down",
        "The zipper on the duffel is louder than you meant it to be. You put the shirts in the drawer in the order they came out.",
        ["safety"]
      ),
    ],
  },
  {
    n: 2, track: "roommate", key: "starter_roommate_window", segment: "morning", due: 1, window: 3, order: 2,
    title: "Paint",
    body:
      "Someone has left a butter knife on your desk, blade toward the window sash. There is no note. A thin line of old paint has already been scored along one edge, and the scoring is not yours.",
    requirements: { requires_flag: "starter_roommate_spoke" },
    choices: [
      choice(
        "work_the_sash",
        "Work the knife along the sash",
        "Flakes of paint land on the sill like dandruff. Halfway down the second side the frame gives a little, and cold air comes in at the seam.",
        ["achieve"],
        { energy_cost: 2, sets_flag: ["starter_window_freed"] }
      ),
      choice(
        "leave_it",
        "Leave the knife where it is",
        "You push it a few inches to the left so it is not pointing at anyone. The window stays shut.",
        ["safety"]
      ),
    ],
  },
  {
    n: 3, track: "academic", key: "starter_academic_syllabus", segment: "afternoon", due: 0, window: 2, order: 1,
    title: "Three pages, stapled",
    body:
      "The syllabus is three pages, stapled at a slant. The reading list is on the second page and the due dates on the third. At the bottom, in the professor’s handwriting: Office hours by appointment. Ask. The first paper is due before you know where the library keeps its coats.",
    choices: [
      choice(
        "read_it_through",
        "Read it through while the room is quiet",
        "You underline the due dates, then the reading you recognize, then the reading you do not. The second list is longer.",
        ["achieve"],
        {
          energy_cost: 3,
          outcome: { deltas: { resources: { knowledge: 1 } } },
          sets_track_state: { state: "active_engagement" },
        }
      ),
      choice(
        "fold_it_away",
        "Fold it into your bag for later",
        "It goes in between two notebooks, still warm from the copier. You will find it again on the way to something else.",
        ["safety"]
      ),
    ],
  },
  {
    n: 4, track: "academic", key: "starter_academic_reading", segment: "morning", due: 1, window: 3, order: 2,
    title: "The first reading",
    body:
      "The reserve desk hands over the photocopied pages in a rubber-banded stack. Someone before you has pressed a thumbprint into the margin of page four, and written a single word beside it: no.",
    requirements: { requires_storylets: ["starter_academic_syllabus"] },
    choices: [
      choice(
        "start_now",
        "Find a carrel and start on page one",
        "By the third page you are arguing with the thumbprint. By the fifth you have stopped noticing it.",
        ["achieve"],
        { energy_cost: 3, outcome: { deltas: { resources: { knowledge: 1 } } } }
      ),
      choice(
        "skim_first",
        "Skim the headings and decide later",
        "The headings tell you what the author wants you to think. They do not tell you what you think.",
        ["safety"]
      ),
    ],
  },
  {
    n: 5, track: "money", key: "starter_money_envelope", segment: "evening", due: 0, window: 2, order: 1,
    title: "What the envelope holds",
    body:
      "The envelope from home holds a cashier’s check, two twenties folded in half, and a note in block capitals: THIS IS FOR BOOKS. The bookstore line this morning ran out the door and down the steps.",
    choices: [
      choice(
        "count_it",
        "Count it twice and write the total on the inside flap",
        "The number is smaller written down than it was in your head. It is also something you can be wrong about less.",
        ["safety"],
        { energy_cost: 1, sets_flag: ["starter_money_counted"] }
      ),
      choice(
        "put_it_away",
        "Slide it back into the envelope and put it in the drawer",
        "The drawer sticks, then gives. You will know the total when you need to.",
        ["risk"]
      ),
    ],
  },
  {
    n: 6, track: "belonging", key: "starter_belonging_board", segment: "evening", due: 0, window: 2, order: 1,
    title: "The board by the stairs",
    body:
      "Flyers overlap on the corkboard like shingles: a ride board, a lost glove, a hand-lettered notice for a Thursday meeting in the basement lounge, tape curling at one corner. Someone has drawn a small arrow pointing at the time.",
    choices: [
      choice(
        "copy_the_time",
        "Copy the meeting time onto the back of your hand",
        "The ink bleeds a little into the creases of your knuckles. By morning it will be a blur you can still read.",
        ["people"],
        { sets_flag: ["starter_board_noted"] }
      ),
      choice(
        "read_on_the_way_past",
        "Read it on the way past",
        "Thursday. Basement. You decide you will remember, and you very likely will not.",
        ["safety"]
      ),
    ],
  },
  {
    n: 7, track: "opportunity", key: "starter_opportunity_notice", segment: "afternoon", due: 1, window: 3, order: 1,
    title: "Typed, not printed",
    body:
      "The notice is typed, not printed; the e has dropped below the line. Work-study, the dining hall dish room, ten hours a week. Apply in person before Friday. There is no name, only a room number and a pencil on a string.",
    choices: [
      choice(
        "apply_today",
        "Walk over and ask about it today",
        "The room is hot and smells of detergent and boiled corn. The woman at the counter looks at your hands before she looks at you, and then she hands you a form.",
        ["achieve"],
        { energy_cost: 3, sets_flag: ["starter_applied_dish_room"] }
      ),
      choice(
        "think_it_over",
        "Think about it first",
        "You copy the room number into the margin of your notebook, where it sits next to a different list.",
        ["safety"]
      ),
    ],
  },
  {
    n: 8, track: "home", key: "starter_home_phone", segment: "evening", due: 1, window: 2, order: 1,
    title: "The hall phone",
    body:
      "The pay phone on your floor has a line of three by seven-thirty, each person standing as though the line were not there. The receiver cord has been stretched until it hangs in a long lazy loop. The dial is warm from other hands.",
    choices: [
      choice(
        "wait_and_call",
        "Wait your turn and call home",
        "It rings four times. When it is picked up, you can hear the television in the other room before you hear a voice.",
        ["people"],
        { energy_cost: 2, sets_flag: ["starter_called_home"] }
      ),
      choice(
        "write_instead",
        "Write a postcard instead",
        "The picture on the front is of a clock tower you have not yet seen up close. You write four lines and a signature, and the signature is the hardest part.",
        ["safety"]
      ),
    ],
  },
];

export function isStarterInstalled(manifest: StudioManifest): boolean {
  return manifest.storylets.some((row) => row.id === uuid(SCENES[0].n));
}

/** Starter records only (not the base). Throws when a required track is missing or disabled. */
export function starterPack(base: StudioManifest): StudioManifest {
  const trackIdByKey = new Map<string, string>();
  for (const track of base.tracks) {
    if (track.is_enabled) trackIdByKey.set(String(track.key), recordId(track));
  }
  const missing = CHAPTER_ONE_TRACK_KEYS.filter((key) => !trackIdByKey.has(key));
  if (missing.length) {
    throw new Error(`The starter scenes need these enabled tracks: ${missing.join(", ")}.`);
  }

  const storylets: StudioRecord[] = SCENES.map((scene) => ({
    id: uuid(scene.n),
    slug: scene.key,
    storylet_key: scene.key,
    step_key: scene.key,
    title: scene.title,
    body: scene.body,
    choices: scene.choices,
    tags: [scene.track, STARTER_TAG],
    requirements: scene.requirements ?? {},
    weight: 1,
    is_active: true,
    track_id: trackIdByKey.get(scene.track),
    order_index: scene.order,
    due_offset_days: scene.due,
    expires_after_days: scene.window,
    segment: scene.segment,
  }));

  const trackId = (key: string) => trackIdByKey.get(key)!;
  const scenarios: StudioRecord[] = [
    {
      id: uuid(100),
      title: "Starter: the first evening offers the notice board and the envelope",
      day: 0, segment: "evening",
      resolved: {}, choices: {}, flags: [], precluded: [], skills: [],
      expected: ["starter_money_envelope", "starter_belonging_board"], forbidden: [],
    },
    {
      id: uuid(101),
      title: "Starter: speaking to your roommate unlocks the window scene",
      day: 1, segment: "morning",
      resolved: { [trackId("roommate")]: ["starter_roommate_desk"] },
      choices: {}, flags: ["starter_roommate_spoke"], precluded: [], skills: [],
      expected: ["starter_roommate_window"], forbidden: [],
    },
    {
      id: uuid(102),
      title: "Starter: staying quiet means no window scene",
      day: 1, segment: "morning",
      resolved: { [trackId("roommate")]: ["starter_roommate_desk"] },
      choices: {}, flags: [], precluded: [], skills: [],
      expected: [], forbidden: ["starter_roommate_window"],
    },
    {
      id: uuid(103),
      title: "Starter: the reading follows the syllabus",
      day: 1, segment: "morning",
      resolved: { [trackId("academic")]: ["starter_academic_syllabus"] },
      choices: {}, flags: [], precluded: [], skills: [],
      expected: ["starter_academic_reading"], forbidden: [],
    },
  ];
  // Reference check at build time: every scenario names a scene that exists.
  for (const scenario of scenarios) {
    for (const key of [...(scenario.expected as string[]), ...(scenario.forbidden as string[])]) {
      if (!SCENES.some((scene) => scene.key === key)) throw new Error(`Starter scenario names unknown scene ${key}`);
    }
  }
  return { storylets, tracks: [], plans: [], definitions: [], scenarios, consequences: [] };
}

export function starterChanges(base: StudioManifest): StudioChange[] {
  const pack = starterPack(base);
  const kinds: StudioKind[] = ["storylets", "scenarios"];
  return kinds.flatMap((kind) =>
    pack[kind].map((record) => ({ kind, object_id: recordId(record), payload: record }))
  );
}

/**
 * Changes that remove every scene, offer test and consequence rule from a draft, and
 * detach plans and shared definitions from the scenes they pointed at. Tracks stay:
 * the game needs its six Chapter One tracks. Nothing here touches player data.
 */
export function clearCatalogChanges(manifest: StudioManifest): StudioChange[] {
  const removedScenes = new Set(manifest.storylets.map(recordId));
  const changes: StudioChange[] = [];
  for (const kind of ["storylets", "scenarios", "consequences"] as const) {
    for (const row of manifest[kind]) changes.push({ kind, object_id: recordId(row), payload: null });
  }
  for (const kind of ["plans", "definitions"] as const) {
    for (const row of manifest[kind]) {
      const sceneIds = Array.isArray(row.storylet_ids) ? (row.storylet_ids as unknown[]) : [];
      const uses = Array.isArray(row.fact_uses) ? (row.fact_uses as StudioRecord[]) : [];
      const touchesScene =
        sceneIds.some((id) => typeof id === "string" && removedScenes.has(id)) ||
        uses.some((use) => typeof use?.storylet_id === "string" && removedScenes.has(use.storylet_id));
      if (!touchesScene) continue;
      changes.push({
        kind,
        object_id: recordId(row),
        payload: {
          ...row,
          storylet_ids: sceneIds.filter((id) => typeof id !== "string" || !removedScenes.has(id)),
          ...(uses.length
            ? {
                fact_uses: uses.map((use) => {
                  if (typeof use?.storylet_id !== "string" || !removedScenes.has(use.storylet_id)) return use;
                  const { storylet_id: _scene, choice_id: _choice, ...rest } = use;
                  void _scene;
                  void _choice;
                  return rest;
                }),
              }
            : {}),
        },
      });
    }
  }
  return changes;
}
