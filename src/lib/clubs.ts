// Pure clubs helpers + browser-side fetch wrappers. NO server-only imports
// here (no supabaseServer), so this module is safe to import from tests and
// from client components. Server-side DB logic lives in clubs.server.ts.

import type {
  Club,
  ClubApplication,
  ClubApplicationStatus,
  ClubDetail,
  ClubDirectoryEntry,
} from "@/types/clubs";

// Bounds mirror the CHECK constraints in the clubs migration.
export const CLUB_NAME_MIN = 2;
export const CLUB_NAME_MAX = 60;
export const CLUB_DESCRIPTION_MAX = 500;

export type ClubValidation =
  | { ok: true; value: { name: string; description: string } }
  | { ok: false; error: string };

// Validate + normalize create-club input. Trims name/description; description
// is optional and defaults to "". Returns a flat error string for the UI/API.
export function validateClubInput(input: {
  name?: unknown;
  description?: unknown;
}): ClubValidation {
  if (typeof input.name !== "string") {
    return { ok: false, error: "Club name is required." };
  }
  const name = input.name.trim();
  if (name.length < CLUB_NAME_MIN || name.length > CLUB_NAME_MAX) {
    return {
      ok: false,
      error: `Club name must be ${CLUB_NAME_MIN}–${CLUB_NAME_MAX} characters.`,
    };
  }

  let description = "";
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      return { ok: false, error: "Description must be text." };
    }
    description = input.description.trim();
  }
  if (description.length > CLUB_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Description must be ${CLUB_DESCRIPTION_MAX} characters or fewer.`,
    };
  }

  return { ok: true, value: { name, description } };
}

// An application can only be accepted/rejected while pending. Resolved rows
// (accepted/rejected) are terminal.
export function canResolveApplication(status: ClubApplicationStatus): boolean {
  return status === "pending";
}

// ─── Browser fetch wrappers ──────────────────────────────────────────
// Each takes the caller's Supabase access token (from useSession) and maps a
// non-2xx response to a thrown Error carrying the server's message.

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

export type ClubDirectoryResponse = {
  clubs: ClubDirectoryEntry[];
  current_club_id: string | null;
};

export function fetchClubDirectory(token: string) {
  return requestJson<ClubDirectoryResponse>("/api/clubs", token);
}

export function fetchClubDetail(token: string, id: string) {
  return requestJson<ClubDetail>(`/api/clubs/${id}`, token);
}

export function createClubRequest(
  token: string,
  body: { name: string; description: string; is_open_to_applications: boolean }
) {
  return requestJson<{ club: Club }>("/api/clubs/create", token, {
    method: "POST",
    body,
  });
}

export function applyToClubRequest(token: string, clubId: string) {
  return requestJson<{ application: ClubApplication }>("/api/clubs/apply", token, {
    method: "POST",
    body: { club_id: clubId },
  });
}

export function leaveClubRequest(token: string) {
  return requestJson<{ ok: true; left_club_id: string | null }>(
    "/api/clubs/leave",
    token,
    { method: "POST" }
  );
}

export function acceptApplicationRequest(token: string, applicationId: string) {
  return requestJson<{ ok: true }>("/api/clubs/applications/accept", token, {
    method: "POST",
    body: { application_id: applicationId },
  });
}

export function rejectApplicationRequest(token: string, applicationId: string) {
  return requestJson<{ ok: true }>("/api/clubs/applications/reject", token, {
    method: "POST",
    body: { application_id: applicationId },
  });
}
