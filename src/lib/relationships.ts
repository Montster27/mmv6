export type RelationshipState = {
  met: boolean;
  knows_name: boolean;
  knows_face: boolean;
  role_tag?: string;
  relationship: number;
  trust: number;
  reliability: number;
  emotionalLoad: number;
  updated_at?: string;
};

export type RelationshipEventType =
  | "WOKE_IN_SAME_ROOM"
  | "INTRODUCED_SELF"
  | "OVERHEARD_NAME"
  | "SHARED_MEAL"
  | "SMALL_KINDNESS"
  | "AWKWARD_MOMENT"
  | "DISRESPECT"
  | "CONFLICT_LOW"
  | "CONFLICT_HIGH"
  | "REPAIR_ATTEMPT"
  | "NOTICED_FACE"
  | "SHOWED_UP"
  | "WENT_MISSING"
  | "CONFIDED_IN"
  | "DISMISSED"
  | "DEFERRED_TENSION";

export type RelationshipEvent = {
  npc_id: string;
  type: RelationshipEventType;
  magnitude?: number;
};

export type RelationshipLogEntry = {
  npc_id: string;
  type: RelationshipEventType;
  before: RelationshipState;
  after: RelationshipState;
  delta: { relationship?: number; met?: boolean; knows_name?: boolean; knows_face?: boolean };
  source: { storylet_slug: string; choice_id: string };
};

const DEFAULT_RELATIONSHIP = 5;

const ROLE_TAGS: Record<string, string> = {
  npc_roommate_dana: "roommate",
  npc_floor_miguel: "orientation",
  npc_prof_marsh: "professor",
  npc_studious_priya: "classmate",
  npc_floor_cal: "floormate",
  npc_ambiguous_jordan: "acquaintance",
  npc_ra_sandra: "ra",
  npc_parent_voice: "family",
};

export const ALL_YEAR_ONE_NPCS = [
  "npc_roommate_dana",
  "npc_floor_miguel",
  "npc_prof_marsh",
  "npc_studious_priya",
  "npc_floor_cal",
  "npc_ambiguous_jordan",
  "npc_ra_sandra",
  "npc_parent_voice",
] as const;

export type YearOneNpcId = typeof ALL_YEAR_ONE_NPCS[number];

const clampRelationship = (value: number) => Math.max(1, Math.min(10, value));
const clampTrust = (value: number) => Math.max(-3, Math.min(3, value));
const clampReliability = (value: number) => Math.max(-3, Math.min(3, value));
const clampEmotionalLoad = (value: number) => Math.max(0, Math.min(3, value));

const buildDefaultState = (npcId: string): RelationshipState => ({
  met: false,
  knows_name: false,
  knows_face: false,
  role_tag: ROLE_TAGS[npcId],
  relationship: DEFAULT_RELATIONSHIP,
  trust: 0,
  reliability: 0,
  emotionalLoad: 0,
  updated_at: new Date().toISOString(),
});

// Maps each relationship event type to trust/reliability/emotionalLoad deltas.
// Aligns with the Design Bible NPC memory model (trust -3..+3, reliability -3..+3,
// emotionalLoad 0..3).
function eventToMemoryDeltas(
  type: RelationshipEventType,
  magnitude: number
): { trust: number; reliability: number; emotionalLoad: number } {
  const m = magnitude ?? 1;
  const map: Partial<Record<RelationshipEventType, { trust: number; reliability: number; emotionalLoad: number }>> = {
    INTRODUCED_SELF:   { trust: 1 * m,    reliability: 0,         emotionalLoad: 0 },
    WOKE_IN_SAME_ROOM: { trust: 0,         reliability: 0,         emotionalLoad: 0 },
    SHARED_MEAL:       { trust: 0.5 * m,   reliability: 0.5 * m,   emotionalLoad: 0 },
    SMALL_KINDNESS:    { trust: 0.5 * m,   reliability: 0.5 * m,   emotionalLoad: 0 },
    REPAIR_ATTEMPT:    { trust: 0,         reliability: 1 * m,     emotionalLoad: 0 },
    SHOWED_UP:         { trust: 0,         reliability: 1 * m,     emotionalLoad: 0 },
    CONFIDED_IN:       { trust: 1 * m,     reliability: 0,         emotionalLoad: 1 * m },
    WENT_MISSING:      { trust: 0,         reliability: -1 * m,    emotionalLoad: 0 },
    DISMISSED:         { trust: -2 * m,    reliability: 0,         emotionalLoad: 0 },
    CONFLICT_HIGH:     { trust: -2 * m,    reliability: -1 * m,    emotionalLoad: 0 },
    CONFLICT_LOW:      { trust: -1 * m,    reliability: 0,         emotionalLoad: 0 },
    AWKWARD_MOMENT:    { trust: -0.5 * m,  reliability: 0,         emotionalLoad: 0 },
    DEFERRED_TENSION:  { trust: 0,         reliability: -0.5 * m,  emotionalLoad: 0 },
    DISRESPECT:        { trust: -2 * m,    reliability: -1 * m,    emotionalLoad: 0 },
    OVERHEARD_NAME:    { trust: 0,         reliability: 0,         emotionalLoad: 0 },
    NOTICED_FACE:      { trust: 0,         reliability: 0,         emotionalLoad: 0 },
  };
  return map[type] ?? { trust: 0, reliability: 0, emotionalLoad: 0 };
}

export function ensureRelationshipDefaults(
  current: Record<string, RelationshipState> | null | undefined
): { next: Record<string, RelationshipState>; changed: boolean } {
  const next = { ...(current ?? {}) } as Record<string, RelationshipState>;
  let changed = false;
  const now = new Date().toISOString();

  const ensure = (npcId: string, defaults: Partial<RelationshipState>) => {
    const existing = next[npcId];
    if (!existing) {
      next[npcId] = { ...buildDefaultState(npcId), ...defaults, updated_at: now };
      changed = true;
      return;
    }
    const merged: RelationshipState = { ...existing };
    (Object.keys(defaults) as Array<keyof RelationshipState>).forEach((key) => {
      if (merged[key] === undefined) {
        (merged as Record<string, unknown>)[key] = defaults[key];
        changed = true;
      }
    });
    if (changed) {
      merged.updated_at = now;
    }
    next[npcId] = merged;
  };

  // Dana: introduced through the opening arc (arc_opening beat 3)
  ensure("npc_roommate_dana", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "roommate",
    relationship: 5,
  });
  // All others start unmet — they are introduced through storylet events
  ensure("npc_floor_miguel", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "orientation",
    relationship: 5,
  });
  ensure("npc_prof_marsh", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "professor",
    relationship: 5,
  });
  ensure("npc_studious_priya", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "classmate",
    relationship: 5,
  });
  ensure("npc_floor_cal", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "floormate",
    relationship: 5,
  });
  ensure("npc_ambiguous_jordan", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "acquaintance",
    relationship: 5,
  });
  ensure("npc_ra_sandra", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "ra",
    relationship: 5,
  });
  ensure("npc_parent_voice", {
    met: true,
    knows_name: true,
    knows_face: true,
    role_tag: "family",
    relationship: 7,
  });

  return { next, changed };
}

export function migrateLegacyNpcMemory(
  current: Record<string, RelationshipState> | null | undefined,
  npcMemory: Record<string, any> | null | undefined
): { next: Record<string, RelationshipState>; changed: boolean } {
  const base = { ...(current ?? {}) } as Record<string, RelationshipState>;
  if (!npcMemory || typeof npcMemory !== "object") {
    return { next: base, changed: false };
  }
  let changed = false;
  Object.entries(npcMemory).forEach(([npcId, raw]) => {
    if (!raw || typeof raw !== "object") return;
    const record = raw as Record<string, unknown>;
    const trust = typeof record.trust === "number" ? record.trust : 0;
    const relationship = clampRelationship(DEFAULT_RELATIONSHIP + trust);
    const existing = base[npcId] ?? buildDefaultState(npcId);
    const next: RelationshipState = {
      ...existing,
      met: record.met === true || existing.met,
      knows_name: record.knows_name === true || existing.knows_name,
      knows_face: record.knows_face === true || existing.knows_face,
      relationship: existing.relationship ?? relationship,
      updated_at: new Date().toISOString(),
    };
    base[npcId] = next;
    changed = true;
  });
  return { next: base, changed };
}

export function applyRelationshipEvents(
  current: Record<string, RelationshipState> | null | undefined,
  events: RelationshipEvent[],
  source: { storylet_slug: string; choice_id: string }
): { next: Record<string, RelationshipState>; logs: RelationshipLogEntry[] } {
  const next = { ...(current ?? {}) } as Record<string, RelationshipState>;
  const logs: RelationshipLogEntry[] = [];
  const now = new Date().toISOString();

  events.forEach((event) => {
    const magnitude = event.magnitude ?? 1;
    const prev = next[event.npc_id] ?? buildDefaultState(event.npc_id);
    const before = { ...prev };
    let relationshipDelta = 0;
    const after: RelationshipState = { ...prev };

    switch (event.type) {
      case "INTRODUCED_SELF":
        after.met = true;
        after.knows_name = true;
        after.knows_face = true;
        relationshipDelta += 1 * magnitude;
        break;
      case "OVERHEARD_NAME":
        after.knows_name = true;
        break;
      case "WOKE_IN_SAME_ROOM":
        after.met = true;
        after.knows_face = true;
        if (!after.role_tag) after.role_tag = "roommate";
        break;
      case "SHARED_MEAL":
        after.met = true;
        after.knows_face = true;
        relationshipDelta += 1 * magnitude;
        break;
      case "SMALL_KINDNESS":
        relationshipDelta += 1 * magnitude;
        break;
      case "REPAIR_ATTEMPT":
        relationshipDelta += 1 * magnitude;
        break;
      case "SHOWED_UP":
        relationshipDelta += 1 * magnitude;
        after.met = true;
        after.knows_face = true;
        break;
      case "CONFIDED_IN":
        relationshipDelta += 1 * magnitude;
        break;
      case "WENT_MISSING":
        relationshipDelta -= 1 * magnitude;
        break;
      case "DISMISSED":
        relationshipDelta -= 2 * magnitude;
        break;
      case "DEFERRED_TENSION":
        // no delta — just records the pattern
        break;
      case "AWKWARD_MOMENT":
        relationshipDelta -= 1 * magnitude;
        break;
      case "DISRESPECT":
        relationshipDelta -= 2 * magnitude;
        break;
      case "CONFLICT_LOW":
        relationshipDelta -= 1 * magnitude;
        break;
      case "CONFLICT_HIGH":
        relationshipDelta -= 3 * magnitude;
        break;
      case "NOTICED_FACE":
        after.knows_face = true;
        break;
      default:
        break;
    }

    if (relationshipDelta !== 0) {
      after.relationship = clampRelationship(after.relationship + relationshipDelta);
    }

    const memoryDeltas = eventToMemoryDeltas(event.type, magnitude);
    after.trust = clampTrust((after.trust ?? 0) + memoryDeltas.trust);
    after.reliability = clampReliability((after.reliability ?? 0) + memoryDeltas.reliability);
    after.emotionalLoad = clampEmotionalLoad((after.emotionalLoad ?? 0) + memoryDeltas.emotionalLoad);

    after.updated_at = now;
    next[event.npc_id] = after;

    logs.push({
      npc_id: event.npc_id,
      type: event.type,
      before,
      after,
      delta: {
        relationship: relationshipDelta !== 0 ? relationshipDelta : undefined,
        met: before.met !== after.met ? after.met : undefined,
        knows_name:
          before.knows_name !== after.knows_name ? after.knows_name : undefined,
        knows_face:
          before.knows_face !== after.knows_face ? after.knows_face : undefined,
      },
      source,
    });
  });

  return { next, logs };
}

const NPC_DISPLAY_NAMES: Record<string, string> = {
  npc_roommate_dana: "Dana",
  npc_floor_miguel: "Miguel",
  npc_prof_marsh: "Prof. Marsh",
  npc_studious_priya: "Priya",
  npc_floor_cal: "Cal",
  npc_ambiguous_jordan: "Jordan",
  npc_ra_sandra: "Sandra",
  npc_parent_voice: "your parent",
};

/**
 * How to refer to an NPC when the player has seen their face but doesn't
 * know their name yet. Used as a middle tier between stranger and named.
 */
const NPC_FACE_TEXT: Record<string, string> = {
  npc_roommate_dana: "your roommate",
  npc_floor_miguel: "the guy from orientation",
  npc_prof_marsh: "the professor",
  npc_studious_priya: "the woman from class",
  npc_floor_cal: "the guy down the hall",
  npc_ambiguous_jordan: "the person from orientation",
  npc_ra_sandra: "the RA",
  npc_parent_voice: "your parent",
};

/**
 * How to refer to an NPC when the player has never encountered them before.
 * Should read naturally as an indefinite noun phrase.
 */
const NPC_STRANGER_TEXT: Record<string, string> = {
  npc_roommate_dana: "your roommate",
  npc_floor_miguel: "a guy with an easy grin",
  npc_prof_marsh: "the professor",
  npc_studious_priya: "a woman with two columns in her notebook",
  npc_floor_cal: "a guy from down the hall",
  npc_ambiguous_jordan: "someone you haven't met",
  npc_ra_sandra: "the RA",
  npc_parent_voice: "your parent",
};

export function renderNpcName(
  npcId: string,
  relationships: Record<string, RelationshipState> | null | undefined,
  fallback: string
): string {
  const known = relationships?.[npcId]?.knows_name;
  if (!known) return fallback;
  return NPC_DISPLAY_NAMES[npcId] ?? fallback;
}

/**
 * Replace `[[npc_id]]` tokens in a string with the appropriate name or
 * description based on the player's current relationship state.
 *
 * Three tiers (best-to-worst knowledge):
 *   knows_name  → display name ("Miguel")
 *   met / face  → face description ("the guy from orientation")
 *   unknown     → stranger description ("a guy with an easy grin")
 */
export function resolveNpcTokens(
  text: string,
  relationships: Record<string, RelationshipState> | null | undefined
): string {
  return text.replace(/\[\[(\w+)\]\]/g, (_match, npcId: string) => {
    const state = relationships?.[npcId];
    if (state?.knows_name) return NPC_DISPLAY_NAMES[npcId] ?? npcId;
    if (state?.met || state?.knows_face) return NPC_FACE_TEXT[npcId] ?? "someone you recognize";
    return NPC_STRANGER_TEXT[npcId] ?? "someone";
  });
}

export function mapLegacyRelationalEffects(
  relationalEffects: Record<string, Record<string, number>> | undefined
): RelationshipEvent[] {
  if (!relationalEffects) return [];
  const events: RelationshipEvent[] = [];
  Object.entries(relationalEffects).forEach(([npcId, deltas]) => {
    Object.entries(deltas).forEach(([key, value]) => {
      if (typeof value !== "number" || value === 0) return;
      if (key === "trust") {
        events.push({
          npc_id: npcId,
          type: value > 0 ? "SMALL_KINDNESS" : "AWKWARD_MOMENT",
          magnitude: Math.abs(value),
        });
      } else if (key === "reliability") {
        events.push({
          npc_id: npcId,
          type: value < 0 ? "AWKWARD_MOMENT" : "SMALL_KINDNESS",
          magnitude: Math.abs(value),
        });
      }
    });
  });
  return events;
}

export function mapLegacyNpcKnowledge(
  knowledge: Record<string, Record<string, boolean>> | undefined
): RelationshipEvent[] {
  if (!knowledge) return [];
  const events: RelationshipEvent[] = [];
  Object.entries(knowledge).forEach(([npcId, flags]) => {
    if (flags.knows_name) {
      events.push({ npc_id: npcId, type: "OVERHEARD_NAME", magnitude: 1 });
    }
    if (flags.met) {
      events.push({ npc_id: npcId, type: "NOTICED_FACE", magnitude: 1 });
    }
    if (flags.met && flags.knows_name) {
      events.push({ npc_id: npcId, type: "INTRODUCED_SELF", magnitude: 1 });
    }
  });
  return events;
}
