import type { RelationshipState } from "@/lib/relationships";

export type NpcEntry = {
  id: string;
  name: string;
  /** Brief parenthetical fragment for first-encounter body prepend (≤20 words). */
  short_intro: string;
};

export const NPC_REGISTRY: NpcEntry[] = [
  {
    id: "npc_floor_miguel",
    name: "Miguel",
    short_intro: "Miguel Reyes, room 214 — from San Antonio, first on the floor to learn everyone's name",
  },
  {
    id: "npc_prof_marsh",
    name: "Marsh",
    short_intro: "Prof. Marsh, your English lecturer — known for calling on people who look unprepared",
  },
  {
    id: "npc_studious_priya",
    name: "Priya",
    short_intro: "Priya, from your sociology section — always three readings ahead, rarely wastes words",
  },
  {
    id: "npc_floor_cal",
    name: "Cal",
    short_intro: "Cal, two doors down — the kind of person who shows up when things get inconvenient",
  },
  {
    id: "npc_ambiguous_jordan",
    name: "Jordan",
    short_intro: "Jordan, someone you keep running into — their angle isn't clear yet",
  },
  {
    id: "npc_ra_scott",
    name: "Scott",
    short_intro: "Scott, your RA — has seen this all before, handles it professionally anyway",
  },
  {
    id: "npc_roommate_dana",
    name: "Dana",
    short_intro: "Dana, your roommate — already here when you arrived, still figuring each other out",
  },
  {
    id: "npc_contact_wren",
    name: "Wren",
    short_intro: "Wren — an upperclassman who knows more than he's saying, and has reasons for the restraint",
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
