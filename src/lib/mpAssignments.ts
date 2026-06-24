// Pure coordinated-events assignment helpers + browser-side fetch wrappers.
// NO server-only imports (no supabaseServer), so this module is safe to
// import from tests and from client components. Server-side DB logic lives
// in mpAssignments.server.ts. Mirrors the mpEvents.ts / clubs.ts split.

import type { AssignmentSource, PresentPlayer } from "@/types/mpAssignments";

// ─── Display + guard helpers (pure) ──────────────────────────────────

const ASSIGNMENT_SOURCE_LABEL: Record<AssignmentSource, string> = {
  coordinator: "Deployed",
  self_selected: "Showed up",
};

export function assignmentSourceLabel(source: AssignmentSource): string {
  return ASSIGNMENT_SOURCE_LABEL[source] ?? "Present";
}

// Coordinator authorization predicate. True only when the caller is the
// event's coordinator (founder of the sponsoring club). A null coordinator
// (e.g. SCA founder unset) never matches, so coordinator-gated actions fail
// closed until an admin seats a founder.
export function isCoordinator(
  callerId: string,
  coordinatorId: string | null
): boolean {
  return coordinatorId !== null && callerId === coordinatorId;
}

// Self-selection guard. A player may self-select / move unless the
// coordinator has placed them — coordinator deployments are not
// self-overridable (the player must be unassigned or already self_selected).
export function canSelfSelect(
  existing: { source: AssignmentSource } | null
): boolean {
  return !existing || existing.source !== "coordinator";
}

export type PresenceSummary = {
  deployed: number;
  self_selected: number;
  total: number;
};

// Per-source counts for a location's presence list — drives the
// "3 deployed · 2 showed up" card label.
export function summarizePresence(players: PresentPlayer[]): PresenceSummary {
  let deployed = 0;
  let selfSelected = 0;
  for (const p of players) {
    if (p.source === "coordinator") deployed += 1;
    else if (p.source === "self_selected") selfSelected += 1;
  }
  return { deployed, self_selected: selfSelected, total: players.length };
}

// "3 deployed · 2 showed up" / "3 deployed" / "2 showed up" / "Empty".
export function presenceCountLabel(summary: PresenceSummary): string {
  const parts: string[] = [];
  if (summary.deployed > 0) parts.push(`${summary.deployed} deployed`);
  if (summary.self_selected > 0) {
    parts.push(`${summary.self_selected} showed up`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Empty";
}

// ─── Browser fetch wrappers ──────────────────────────────────────────
// Each takes the caller's Supabase access token (from useSession) and maps a
// non-2xx response to a thrown Error carrying the server's message. Copied
// from the mpEvents.ts wrappers.

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

export function assignMember(
  token: string,
  eventId: string,
  body: { location_id: string; player_id: string }
) {
  return requestJson<{ ok: true }>(`/api/events/${eventId}/assign`, token, {
    method: "POST",
    body,
  });
}

export function unassignMember(
  token: string,
  eventId: string,
  body: { player_id: string }
) {
  return requestJson<{ ok: true }>(`/api/events/${eventId}/unassign`, token, {
    method: "POST",
    body,
  });
}

export function selfSelectLocation(
  token: string,
  eventId: string,
  body: { location_id: string }
) {
  return requestJson<{ ok: true }>(
    `/api/events/${eventId}/self-select`,
    token,
    { method: "POST", body }
  );
}

export function leaveLocation(token: string, eventId: string) {
  return requestJson<{ ok: true }>(`/api/events/${eventId}/leave`, token, {
    method: "POST",
    body: {},
  });
}
