import type { RelationshipState } from "@/lib/relationships";

export type NpcEntry = {
  id: string;
  name: string;
  /** Brief parenthetical fragment for first-encounter body prepend (≤20 words). */
  short_intro: string;
};

export const NPC_REGISTRY: NpcEntry[] = [
  // ── Day 1 Core NPCs ──
  {
    id: "npc_roommate_dana",
    name: "Dana",
    short_intro:
      "Dana, your roommate — already set up when you arrived, Tigers pennant on the wall, quiet",
  },
  {
    id: "npc_ra_scott",
    name: "Scott",
    short_intro:
      "Scott, your RA — clipboard, easy smile, says yes to everything",
  },
  {
    id: "npc_contact_glenn",
    name: "Glenn",
    short_intro: "Glenn — an upperclassman on a bench near the chapel, knows more than he's saying",
  },
  {
    id: "npc_floor_doug",
    name: "Doug",
    short_intro: "Doug, two doors down — his brother went here, he already knows where everything is",
  },
  {
    id: "npc_floor_mike",
    name: "Mike",
    short_intro: "Mike, down the hall — textbook under his arm on day one, precise when he talks",
  },
  {
    id: "npc_floor_keith",
    name: "Keith",
    short_intro: "Keith Hollis, end of the hall — calloused hands, gives his full name, from a farm",
  },
  {
    id: "npc_anderson_bryce",
    name: "Bryce",
    short_intro: "Bryce, Anderson Hall — throws parties, greets everyone like they're already friends",
  },
  {
    id: "npc_floor_peterson",
    name: "Peterson",
    short_intro: "Peterson, from the floor — tall, glasses, quiet voice, shuffles cards like he means it",
  },
  // ── Later NPCs (Week 1+) ──
  {
    id: "npc_prof_marsh",
    name: "Marsh",
    short_intro:
      "Prof. Marsh, your English lecturer — known for calling on people who look unprepared",
  },
  {
    id: "npc_studious_priya",
    name: "Priya",
    short_intro:
      "Priya, from your sociology section — always three readings ahead, rarely wastes words",
  },
  {
    id: "npc_ambiguous_jordan",
    name: "Jordan",
    short_intro:
      "Jordan, someone you keep running into — their angle isn't clear yet",
  },
  {
    id: "npc_parent_voice",
    name: "your parent",
    short_intro: "Your parent — the voice on the other end of the hallway phone",
  },
  // ── Week 2 NPCs ──
  {
    id: "npc_prof_heller",
    name: "Heller",
    short_intro:
      "Prof. Heller, sociology — says things that sound offhand and are not",
  },
  {
    id: "npc_ta_tomas",
    name: "Tomas",
    short_intro:
      "Tomas, Heller's TA — grading at the side desk, pen moving in a steady rhythm",
  },
  {
    id: "npc_librarian_doerr",
    name: "Mrs. Doerr",
    short_intro:
      "Mrs. Doerr, head librarian — has a system for the returns cart and explains it twice",
  },
  {
    id: "npc_dining_terry",
    name: "Terry",
    short_intro:
      "Terry — works the kitchen, not a student, does not ask your name",
  },
  {
    id: "npc_grounds_vince",
    name: "Vince",
    short_intro:
      "Vince, a sophomore on the grounds crew — headphones on, Walkman clipped to his belt",
  },
  {
    id: "npc_econ_rebecca",
    name: "Rebecca",
    short_intro:
      "Rebecca Chen, economics department — watches you work without turning a page",
  },
  {
    id: "npc_study_wes",
    name: "Wes",
    short_intro:
      "Wes, a sophomore from Connecticut — knows more than he lets on about the Peloponnesian War",
  },
];

export function getNpcEntry(id: string): NpcEntry | undefined {
  return NPC_REGISTRY.find((e) => e.id === id);
}

/**
 * Returns the body text to display. If introduces_npc lists any unmet NPC,
 * prepends their short_intro as a parenthetical paragraph before the body.
 * Only the first unmet NPC generates a prefix (introductions happen one at a time).
 */
export function getDisplayBody(
  body: string,
  introducesNpc: string[] | undefined,
  relationships: Record<string, RelationshipState> | null | undefined
): string {
  if (!introducesNpc?.length) return body;
  for (const npcId of introducesNpc) {
    if (!relationships?.[npcId]?.met) {
      const entry = getNpcEntry(npcId);
      if (entry) return `(${entry.short_intro}.)\n\n${body}`;
    }
  }
  return body;
}
