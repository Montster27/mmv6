// Pure coordinated-events round/phase helpers + browser fetch wrappers.
// NO server-only imports here, so this module is safe to import from tests
// and client components. Server-side DB logic lives in mpRounds.server.ts.
// Mirrors the mpEvents.ts / mpAssignments.ts split.

import type { MpEventLocationState } from "@/types/mpEvents";
import type { EventDetailFull, EventPhaseState, MpPhase } from "@/types/mpRounds";

// ─── Config constants ─────────────────────────────────────────────────
// Demo-tuned — swap for skill-based contributions in a later slice.
export const TRANSIT_LAG_SECONDS = 20;
export const ROUND_DURATION_SECONDS = 120;
export const PRESSURE_THRESHOLD = 2;
export const AI_CON_DRIFT = 1;

// ─── Placeholder contribution function ───────────────────────────────
// One pressure unit per present player. Isolated here so it can be replaced
// when encounter results drive the value.
export function placeholderPresenceScore(playerCount: number): number {
  return playerCount;
}

// ─── Phase/clock helpers ──────────────────────────────────────────────

// Remaining seconds in the active round. Null when not in active phase.
// May be negative when the round has expired (lazy-expiry model).
export function computeRemainingSeconds(
  activeStartedAt: string | null,
  durationSeconds: number
): number | null {
  if (!activeStartedAt) return null;
  const elapsedMs = Date.now() - new Date(activeStartedAt).getTime();
  return durationSeconds - Math.floor(elapsedMs / 1000);
}

// True when the round is in active phase and the clock has run out.
export function isRoundExpired(
  activeStartedAt: string | null,
  durationSeconds: number
): boolean {
  const remaining = computeRemainingSeconds(activeStartedAt, durationSeconds);
  return remaining !== null && remaining <= 0;
}

// ─── State transition (one step per boundary) ────────────────────────
// Applies net pro and con pressure to a location state. Each call moves
// the state at most one step — never jumps from contested straight to locked.
export function applyStateDelta(
  state: MpEventLocationState,
  netPro: number,
  netCon: number
): MpEventLocationState {
  switch (state) {
    case "contested":
      if (netPro >= PRESSURE_THRESHOLD) return "leaning_yes";
      if (netCon >= PRESSURE_THRESHOLD) return "leaning_no";
      return "contested";
    case "leaning_yes":
      if (netPro >= PRESSURE_THRESHOLD) return "won";
      if (netCon >= PRESSURE_THRESHOLD) return "contested";
      return "leaning_yes";
    case "leaning_no":
      if (netCon >= PRESSURE_THRESHOLD) return "lost";
      if (netPro >= PRESSURE_THRESHOLD) return "contested";
      return "leaning_no";
    case "won":
    case "lost":
      return state; // terminal — not reversed in this slice
  }
}

// ─── Risk cost and split/state helpers ───────────────────────────────
// RISK_COST drives exposure accrual at round resolution (server-side) and
// the Deploy screen's exposure forecast (client-side).
// stateToSplit / splitToState translate between the discrete state FSM and
// the continuous 0–100 split display value. In this slice, stateToSplit
// snaps split to the midpoint of each band; a later slice inverts this so
// split drives state via threshold comparison.

export const RISK_COST = {
  safe:         6,
  risk_covered: 10, // risk lane with ≥1 clubmate on the ground
  risk_solo:    22, // risk lane alone
} as const;

const STATE_SPLIT_MIDPOINT: Record<MpEventLocationState, number> = {
  won:         90,
  leaning_yes: 70,
  contested:   50,
  leaning_no:  30,
  lost:        10,
};

export function stateToSplit(state: MpEventLocationState): number {
  return STATE_SPLIT_MIDPOINT[state] ?? 50;
}

export function splitToState(split: number): MpEventLocationState {
  if (split >= 80) return "won";
  if (split >= 60) return "leaning_yes";
  if (split >= 40) return "contested";
  if (split >= 20) return "leaning_no";
  return "lost";
}

// ─── AI opposition (minimal placeholder) ─────────────────────────────
// Input shape: just the fields the pure function needs — no server imports.
type AiInputLocation = {
  id: string;
  state: MpEventLocationState;
  display_order: number;
};

// Returns per-location con bumps and the one "committed" escalation ID.
//
// Con drift applies to all non-terminal locations. Escalation priority:
//   1. leaning_no  (about to tip — most impactful push for a legible demo)
//   2. contested   (adding visible pressure)
//   3. leaning_yes (fighting back)
// Within each tier, lowest display_order wins (predictable, demo-friendly).
export function computeAiDrift(locations: AiInputLocation[]): {
  conBumps: Record<string, number>;
  escalated_id: string | null;
} {
  const eligible = locations.filter(
    (l) => l.state !== "won" && l.state !== "lost"
  );

  const conBumps: Record<string, number> = {};
  for (const l of eligible) {
    conBumps[l.id] = AI_CON_DRIFT;
  }

  const TIER: Record<string, number> = {
    leaning_no:  0,
    contested:   1,
    leaning_yes: 2,
  };
  const sorted = [...eligible].sort((a, b) => {
    const ta = TIER[a.state] ?? 99;
    const tb = TIER[b.state] ?? 99;
    return ta !== tb ? ta - tb : a.display_order - b.display_order;
  });

  return { conBumps, escalated_id: sorted[0]?.id ?? null };
}

// ─── Phase display helpers ────────────────────────────────────────────

const PHASE_LABEL: Record<MpPhase, string> = {
  planning: "Planning",
  active: "Active",
  resolving: "Resolving",
};

export function phaseLabel(phase: MpPhase): string {
  return PHASE_LABEL[phase] ?? "Unknown";
}

// ─── Browser fetch wrappers ───────────────────────────────────────────
// Each takes the caller's Supabase access token (from useSession) and maps
// a non-2xx response to a thrown Error carrying the server's message.
// Mirrors the mpEvents.ts / mpAssignments.ts wrappers.

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
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; detail?: string })
    | null;
  if (!res.ok) {
    const message =
      (json && (json.error || json.detail)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export function fetchEventDetailFull(
  token: string,
  id: string
): Promise<EventDetailFull> {
  return requestJson<EventDetailFull>(`/api/events/${id}`, token);
}

export function startRound(token: string, eventId: string) {
  return requestJson<{ ok: true; round_number: number }>(
    `/api/events/${eventId}/round/start`,
    token,
    { method: "POST", body: {} }
  );
}

export function resolveRound(token: string, eventId: string) {
  return requestJson<{ ok: true; round_number: number }>(
    `/api/events/${eventId}/round/resolve`,
    token,
    { method: "POST", body: {} }
  );
}

export function moveMember(
  token: string,
  eventId: string,
  body: { player_id: string; to_location_id: string }
) {
  return requestJson<{ ok: true; arrives_at: string }>(
    `/api/events/${eventId}/move`,
    token,
    { method: "POST", body }
  );
}

// Re-export EventPhaseState so board page imports are one-stop.
export type { EventPhaseState };
