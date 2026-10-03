import { supabase } from "@/lib/supabase/browser";

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { ok: false, error: "No session found. Please sign in again." };
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(typeof window !== "undefined" && sessionStorage.getItem("studio.workspace") ? { "X-Studio-Workspace": sessionStorage.getItem("studio.workspace")!, "X-Studio-Revision": sessionStorage.getItem("studio.revision") ?? "" } : {}),
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      const errorMsg = json.error ?? `Request failed with status ${res.status}`;
      return { ok: false, error: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg) };
    }

    if (typeof window !== "undefined") {
      const revision = json.revision ?? json.workspace?.revision ?? json.storylets?.[0]?._studio_revision ?? json.arcs?.[0]?._studio_revision ?? json.rules?.[0]?._studio_revision;
      if (Number.isInteger(revision)) sessionStorage.setItem("studio.revision", String(revision));
    }
    return { ok: true, data: json };
  } catch (err) {
    console.error("API request failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
