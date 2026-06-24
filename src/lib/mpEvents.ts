// Pure coordinated-events helpers + browser-side fetch wrappers. NO
// server-only imports here (no supabaseServer), so this module is safe to
// import from tests and from client components. Server-side DB logic lives
// in mpEvents.server.ts. Mirrors the clubs.ts split.

import type {
  ExposureTier,
  MpEventListEntry,
  MpEventLocationState,
  MpEventLocationType,
} from "@/types/mpEvents";
import type { EventDetailWithPresence } from "@/types/mpAssignments";

// ─── Display helpers (pure) ──────────────────────────────────────────

const LOCATION_STATE_LABEL: Record<MpEventLocationState, string> = {
  contested:   "Contested",
  leaning_yes: "Warming",
  leaning_no:  "Cooling",
  won:         "With you",
  lost:        "Against",
};

export function locationStateLabel(state: MpEventLocationState): string {
  return LOCATION_STATE_LABEL[state] ?? "Unknown";
}

// Heatmap color coding (Tailwind classes applied to each location card).
// "locked" states are solid; "leaning" states are light tints; "contested"
// is neutral gray. Spec: docs/prompts/MP-02-heatmap.md.
const LOCATION_STATE_CLASSES: Record<MpEventLocationState, string> = {
  contested:   "border-slate-300 bg-slate-100 text-slate-700",
  leaning_yes: "border-green-300 bg-green-100 text-green-900",
  leaning_no:  "border-red-300 bg-red-100 text-red-900",
  won:         "border-green-700 bg-green-600 text-white",
  lost:        "border-red-700 bg-red-600 text-white",
};

export function locationStateClasses(state: MpEventLocationState): string {
  return LOCATION_STATE_CLASSES[state] ?? LOCATION_STATE_CLASSES.contested;
}

const LOCATION_TYPE_LABEL: Record<MpEventLocationType, string> = {
  dorm: "Dorm",
  dining: "Dining hall",
  social: "Social",
  academic: "Academic",
  admin: "Admin",
  merchant: "Merchant",
  other: "Other",
};

export function locationTypeLabel(type: MpEventLocationType): string {
  return LOCATION_TYPE_LABEL[type] ?? "Other";
}

// ─── Exposure tier helpers (Signal 1 — personal risk) ────────────────
// Used by the campaign board game bar and the Deploy exposure forecast.
// `glow` is the CSS HSL color for the ember-dot and meter fill.

export const EXPOSURE_TIERS: ExposureTier[] = [
  { max: 25,  key: "unseen",  label: "Unseen",  glow: "hsl(43 70% 52%)",  read: "Nobody's watching you yet." },
  { max: 55,  key: "noticed", label: "Noticed", glow: "hsl(28 78% 52%)",  read: "You're starting to be a known quantity." },
  { max: 80,  key: "watched", label: "Watched", glow: "hsl(14 76% 52%)",  read: "The other side is tracking your moves. Reframes land weaker." },
  { max: 101, key: "burned",  label: "Burned",  glow: "hsl(0 72% 48%)",   read: "You're radioactive. Lay low a round before the cold lanes." },
];

export function exposureTier(v: number): ExposureTier {
  return EXPOSURE_TIERS.find((t) => v < t.max) ?? EXPOSURE_TIERS[EXPOSURE_TIERS.length - 1];
}

// ─── Browser fetch wrappers ──────────────────────────────────────────
// Each takes the caller's Supabase access token (from useSession) and maps a
// non-2xx response to a thrown Error carrying the server's message. Copied
// from the clubs.ts wrappers.

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

export type MpEventListResponse = {
  events: MpEventListEntry[];
};

export function fetchEvents(token: string) {
  return requestJson<MpEventListResponse>("/api/events", token);
}

// The detail endpoint folds in MP-03 assignment presence, so the wrapper
// returns the presence-augmented shape.
export function fetchEventDetail(token: string, id: string) {
  return requestJson<EventDetailWithPresence>(`/api/events/${id}`, token);
}
