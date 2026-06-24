// Pure encounter helpers + browser fetch wrappers.
// NO server-only imports — safe to use in tests and client components.
// Server-side DB logic lives in mpEncounters.server.ts.
// Mirrors the mpRounds.ts / mpEvents.ts split.

import type {
  EncounterResult,
  EncounterView,
  ReframeOption,
} from "@/types/mpEncounters";

// ─── Merchant Row constant ────────────────────────────────────────────
// TODO(single-slice debt): hardcoded for the first encounter location only;
// generalize when other locations have mp_location_games rows.
export const MERCHANT_ROW_LOCATION_ID =
  "1c000000-0000-4000-a000-000000000002";

// ─── Skill helpers ────────────────────────────────────────────────────

// Arc One skill levels are binary: trained or not.
// trainedSkillIds should be the list of skill_id values where status='trained'.
export function hasSkill(
  trainedSkillIds: string[],
  skillId: string | null
): boolean {
  if (!skillId) return false;
  return trainedSkillIds.includes(skillId);
}

// ─── Pressure math ───────────────────────────────────────────────────
// Server owns authoritative computation; this pure function is shared with
// mpEncounters.server.ts and the test suite.
//
// Trap options yield negative con pressure regardless of skill — picking the
// wrong reframe for this constituency confirms their objection and pushes
// Merchant Row toward con.
//
// Non-trap: base_pro + skill_amplifier when the player has the relevant
// skill. A low-skill player still gets base_pro — skill amplifies, not gates.
export function computePressure(
  option: ReframeOption,
  playerHasSkill: boolean
): number {
  if (option.is_trap) {
    return -option.base_con_pressure;
  }
  return (
    option.base_pro_pressure + (playerHasSkill ? option.skill_amplifier : 0)
  );
}

// Resolve text: skill-holder sees the competent variant; others see base.
export function selectResolveText(
  option: ReframeOption,
  playerHasSkill: boolean
): string {
  return playerHasSkill ? option.resolve_with_skill : option.resolve_base;
}

// ─── Browser fetch wrappers ───────────────────────────────────────────

async function requestJson<T>(
  path: string,
  token: string,
  init?: { method?: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const method = init?.method ?? "GET";
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; detail?: string })
    | null;
  if (!res.ok) {
    const message =
      (json && (json.error || json.detail)) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export function fetchEncounter(
  token: string,
  eventId: string,
  locationId: string
): Promise<EncounterView> {
  return requestJson<EncounterView>(
    `/api/events/${eventId}/location/${locationId}/encounter`,
    token
  );
}

export function runEncounter(
  token: string,
  eventId: string,
  locationId: string,
  body: { option_id: string }
): Promise<EncounterResult> {
  return requestJson<EncounterResult>(
    `/api/events/${eventId}/location/${locationId}/encounter`,
    token,
    { method: "POST", body }
  );
}
