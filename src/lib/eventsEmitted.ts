import type {
  ConditionalEmissionGroup,
  EventEmission,
} from "@/types/storylets";

function isGrouped(
  raw: EventEmission[] | ConditionalEmissionGroup[]
): raw is ConditionalEmissionGroup[] {
  const first = raw[0];
  return (
    !!first &&
    typeof first === "object" &&
    "condition" in first &&
    "events" in first &&
    Array.isArray((first as ConditionalEmissionGroup).events)
  );
}

/**
 * Resolve a choice's `events_emitted` field to the flat list of events that
 * should fire now. Accepts both the flat form (pre-spec) and the grouped form
 * (period-stance spec §Q3). For grouped form:
 *   - top-to-bottom, first non-`else` condition matching the active flag set
 *     wins and its events fire; remaining groups are skipped.
 *   - if no non-else condition matched, every `else` group's events fire.
 *
 * A missing or empty input returns [] so call sites can safely spread.
 */
export function resolveEventsEmitted(
  raw: EventEmission[] | ConditionalEmissionGroup[] | undefined | null,
  activeFlags: Set<string> = new Set()
): EventEmission[] {
  if (!raw || raw.length === 0) return [];
  if (!isGrouped(raw)) return raw as EventEmission[];

  let matched = false;
  const matchedEvents: EventEmission[] = [];
  const elseEvents: EventEmission[] = [];

  for (const group of raw) {
    const cond = group.condition ?? {};
    if (cond.else) {
      elseEvents.push(...group.events);
      continue;
    }
    if (matched) continue;
    let ok = true;
    if (cond.flag && !activeFlags.has(cond.flag)) ok = false;
    if (ok && cond.all_flags) {
      for (const f of cond.all_flags) {
        if (!activeFlags.has(f)) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      matched = true;
      matchedEvents.push(...group.events);
    }
  }

  return matched ? matchedEvents : elseEvents;
}

/**
 * Flatten both flat and grouped forms to the union of every event that COULD
 * fire, regardless of condition. Admin tooling uses this to enumerate every
 * NPC referenced by a choice without evaluating walk-flag state.
 */
export function flattenAllEvents(
  raw: EventEmission[] | ConditionalEmissionGroup[] | undefined | null
): EventEmission[] {
  if (!raw || raw.length === 0) return [];
  if (!isGrouped(raw)) return raw as EventEmission[];
  return raw.flatMap((group) => group.events);
}
