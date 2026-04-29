// Phase 1 instrumentation for T-1777400000001 — diagnose session/restart state corruption.
// Emits a single [STATE] line per state mutation; on the client also maintains a sessionStorage
// ring buffer at "mmv:state-log" surfaced as window.__stateLog for devtools triage.
// See docs/CODE-BRIEF-2026-04-30-state-persistence.md.

const RING_BUFFER_KEY = "mmv:state-log";
const RING_BUFFER_MAX = 200;

const BUILD_SHA: string =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) ??
  "dev";

export type StateLogSurface =
  | "time-advance"
  | "reset"
  | "track-resolve"
  | "choice-log"
  | "walk-state"
  | "session-restore"
  | "micro-choice"
  | "daily-state-mutation";

export type StateLogEntry = {
  surface: StateLogSurface;
  action: string;
  userId?: string;
  details?: Record<string, unknown>;
  ts: string;
  sha: string;
};

export type StateLogInput = Omit<StateLogEntry, "ts" | "sha">;

declare global {
  interface Window {
    __stateLog?: StateLogEntry[];
  }
}

export function logState(input: StateLogInput): void {
  const entry: StateLogEntry = {
    ...input,
    ts: new Date().toISOString(),
    sha: BUILD_SHA,
  };

  try {
    console.log("[STATE]", JSON.stringify(entry));
  } catch {
    console.log("[STATE]", JSON.stringify({ ...entry, details: "<unserializable>" }));
  }

  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(RING_BUFFER_KEY);
    const arr: StateLogEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    while (arr.length > RING_BUFFER_MAX) arr.shift();
    window.sessionStorage.setItem(RING_BUFFER_KEY, JSON.stringify(arr));
    window.__stateLog = arr;
  } catch {
    /* sessionStorage may be full / disabled / blocked — degrade silently */
  }
}
