export type RelationshipState = {
  met: boolean;
  knows_name: boolean;
  knows_face: boolean;
  role_tag?: string;
  relationship: number;
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
  | "NOTICED_FACE";

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
  npc_connector_miguel: "orientation",
};

const clampRelationship = (value: number) => Math.max(1, Math.min(10, value));

const buildDefaultState = (npcId: string): RelationshipState => ({
  met: false,
  knows_name: false,
  knows_face: false,
  role_tag: ROLE_TAGS[npcId],
  relationship: DEFAULT_RELATIONSHIP,
  updated_at: new Date().toISOString(),
});

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
        merged[key] = defaults[key] as any;
        changed = true;
      }
    });
    if (changed) {
      merged.updated_at = now;
    }
    next[npcId] = merged;
  };

  ensure("npc_roommate_dana", {
    met: true,
    knows_name: true,
    knows_face: true,
    role_tag: "roommate",
    relationship: 6,
  });
  ensure("npc_connector_miguel", {
    met: false,
    knows_name: false,
    knows_face: false,
    role_tag: "orientation",
    relationship: 5,
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

export function renderNpcName(
  npcId: string,
  relationships: Record<string, RelationshipState> | null | undefined,
  fallback: string
): string {
  const known = relationships?.[npcId]?.knows_name;
  if (!known) return fallback;
  if (npcId === "npc_roommate_dana") return "Dana";
  if (npcId === "npc_connector_miguel") return "Miguel";
  return fallback;
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
