import { useCallback, useState } from "react";

import { supabase } from "@/lib/supabase/browser";
import { buildAuditMeta } from "@/lib/contentStudio/audit";
import type { Storylet } from "@/types/storylets";
import type { DelayedConsequenceRule } from "@/types/consequences";
import type { RemnantRule } from "@/types/remnants";
import type { ContentVersion } from "@/types/contentVersions";

export type APIState = {
  loading: boolean;
  error: string | null;
};

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function apiRequest<T>(
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
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const json = await res.json();

    if (!res.ok) {
      const errorMsg = json.error ?? `Request failed with status ${res.status}`;
      return { ok: false, error: errorMsg };
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

export function useContentStudioAPI() {
  const [storyletsState, setStoryletsState] = useState<APIState>({
    loading: false,
    error: null,
  });
  const [rulesState, setRulesState] = useState<APIState>({
    loading: false,
    error: null,
  });
  const [remnantRulesState, setRemnantRulesState] = useState<APIState>({
    loading: false,
    error: null,
  });
  const [versionsState, setVersionsState] = useState<APIState>({
    loading: false,
    error: null,
  });

  // Storylets
  const loadStorylets = useCallback(
    async (
      filters: { search?: string; active?: string } = {}
    ): Promise<Storylet[]> => {
      setStoryletsState({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.active && filters.active !== "all") {
        params.set("active", filters.active);
      }

      const result = await apiRequest<{ storylets: Storylet[] }>(
        `/api/admin/storylets?${params.toString()}`
      );

      if (!result.ok) {
        setStoryletsState({ loading: false, error: result.error ?? null });
        return [];
      }

      setStoryletsState({ loading: false, error: null });
      return result.data?.storylets ?? [];
    },
    []
  );

  const createStorylet = useCallback(
    async (
      draft: Omit<Storylet, "id">,
      userEmail: string | null
    ): Promise<{ ok: boolean; id?: string; error?: string }> => {
      const id = `draft_${Date.now()}`;
      const body = draft.body?.trim() ? draft.body : "Draft body.";

      const result = await apiRequest<{ id: string }>("/api/admin/storylets", {
        method: "POST",
        body: JSON.stringify({
          id,
          ...draft,
          body,
          requirements: {
            ...draft.requirements,
            audit: buildAuditMeta(userEmail),
          },
        }),
      });

      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      return { ok: true, id: result.data?.id ?? id };
    },
    []
  );

  const saveStorylet = useCallback(
    async (
      storylet: Storylet,
      userEmail: string | null
    ): Promise<{ ok: boolean; error?: string }> => {
      const requirements = {
        ...(storylet.requirements ?? {}),
        audit: buildAuditMeta(userEmail),
      };

      const result = await apiRequest(`/api/admin/storylets/${storylet.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...storylet, requirements }),
      });

      return { ok: result.ok, error: result.error };
    },
    []
  );

  // Consequence Rules
  const loadRules = useCallback(async (): Promise<DelayedConsequenceRule[]> => {
    setRulesState({ loading: true, error: null });

    const result = await apiRequest<{ rules: DelayedConsequenceRule[] }>(
      "/api/admin/consequences"
    );

    if (!result.ok) {
      setRulesState({ loading: false, error: result.error ?? null });
      return [];
    }

    setRulesState({ loading: false, error: null });
    return result.data?.rules ?? [];
  }, []);

  const saveRule = useCallback(
    async (
      rule: DelayedConsequenceRule,
      isNew: boolean
    ): Promise<{ ok: boolean; error?: string }> => {
      const url = isNew
        ? "/api/admin/consequences"
        : `/api/admin/consequences/${rule.key}`;

      const result = await apiRequest(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(rule),
      });

      return { ok: result.ok, error: result.error };
    },
    []
  );

  const deleteRule = useCallback(
    async (key: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/consequences/${key}`, {
        method: "DELETE",
      });
      return { ok: result.ok, error: result.error };
    },
    []
  );

  // Remnant Rules
  const loadRemnantRules = useCallback(async (): Promise<RemnantRule[]> => {
    setRemnantRulesState({ loading: true, error: null });

    const result = await apiRequest<{ rules: RemnantRule[] }>(
      "/api/admin/remnant-rules"
    );

    if (!result.ok) {
      setRemnantRulesState({ loading: false, error: result.error ?? null });
      return [];
    }

    setRemnantRulesState({ loading: false, error: null });
    return result.data?.rules ?? [];
  }, []);

  const saveRemnantRule = useCallback(
    async (
      rule: RemnantRule,
      isNew: boolean
    ): Promise<{ ok: boolean; error?: string }> => {
      const url = isNew
        ? "/api/admin/remnant-rules"
        : `/api/admin/remnant-rules/${rule.remnant_key}`;

      const result = await apiRequest(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(rule),
      });

      return { ok: result.ok, error: result.error };
    },
    []
  );

  // Content Versions
  const loadVersions = useCallback(async (): Promise<ContentVersion[]> => {
    setVersionsState({ loading: true, error: null });

    const result = await apiRequest<{ versions: ContentVersion[] }>(
      "/api/admin/content-versions"
    );

    if (!result.ok) {
      setVersionsState({ loading: false, error: result.error ?? null });
      return [];
    }

    setVersionsState({ loading: false, error: null });
    return result.data?.versions ?? [];
  }, []);

  const publishContent = useCallback(
    async (note: string): Promise<{ ok: boolean; versionId?: string; error?: string }> => {
      const result = await apiRequest<{ version_id: string }>(
        "/api/admin/content-versions",
        {
          method: "POST",
          body: JSON.stringify({ note }),
        }
      );

      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      return { ok: true, versionId: result.data?.version_id };
    },
    []
  );

  const rollbackVersion = useCallback(
    async (versionId: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest("/api/admin/content-versions/rollback", {
        method: "POST",
        body: JSON.stringify({ version_id: versionId }),
      });

      return { ok: result.ok, error: result.error };
    },
    []
  );

  return {
    // States
    storyletsState,
    rulesState,
    remnantRulesState,
    versionsState,

    // Storylet operations
    loadStorylets,
    createStorylet,
    saveStorylet,

    // Rule operations
    loadRules,
    saveRule,
    deleteRule,

    // Remnant rule operations
    loadRemnantRules,
    saveRemnantRule,

    // Version operations
    loadVersions,
    publishContent,
    rollbackVersion,
  };
}
