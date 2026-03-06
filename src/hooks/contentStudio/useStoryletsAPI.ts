import { useCallback, useState } from "react";

import { apiRequest } from "@/lib/contentStudio/apiClient";
import { buildAuditMeta } from "@/lib/contentStudio/audit";
import type { Storylet } from "@/types/storylets";

export function useStoryletsAPI() {
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStorylets = useCallback(
    async (filters?: { search?: string; active?: string }): Promise<Storylet[]> => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.active && filters.active !== "all") params.set("active", filters.active);

      const result = await apiRequest<{ storylets: Storylet[] }>(
        `/api/admin/storylets?${params.toString()}`
      );

      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? null);
        return [];
      }

      const rows = result.data?.storylets ?? [];
      setStorylets(rows);
      return rows;
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

  const createStorylet = useCallback(
    async (
      draft: Omit<Storylet, "id">,
      userEmail: string | null
    ): Promise<{ ok: true; id: string } | { ok: false; error?: string }> => {
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

      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, id: result.data?.id ?? id };
    },
    []
  );

  const deleteStorylet = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/storylets/${id}`, {
        method: "DELETE",
      });
      return { ok: result.ok, error: result.error };
    },
    []
  );

  const cloneStorylet = useCallback(
    async (
      storylet: Storylet,
      userEmail: string | null
    ): Promise<{ ok: true; id: string } | { ok: false; error?: string }> => {
      const { id: _id, created_at: _c, ...rest } = storylet;
      void _id;
      void _c;
      const draft: Omit<Storylet, "id"> = {
        ...rest,
        slug: `${storylet.slug}-copy`,
        title: `${storylet.title} (copy)`,
        is_active: false,
      };
      return createStorylet(draft, userEmail);
    },
    [createStorylet]
  );

  return {
    storylets,
    setStorylets,
    loading,
    error,
    loadStorylets,
    saveStorylet,
    createStorylet,
    cloneStorylet,
    deleteStorylet,
  };
}
